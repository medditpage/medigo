// assignment.service.ts
import { prisma } from "../utils/prisma";
import { notify, notifyAdmins } from "./notification.service";

interface NearestAgentRow {
  agent_id: string;
  user_id: string;
  full_name: string;
  mobile: string;
  vehicle_type: string;
  vehicle_number: string;
  current_latitude: number | null;
  current_longitude: number | null;
  distance_km: number;
  rating_avg: number;
}

// FIX 2: Robust agent broadcast
// Priority 1: Online approved agents within 15km radius WITH location set (PostGIS)
// Priority 2: Online approved agents anywhere (no location filter)
// Priority 3: Any approved agent (offline fallback so orders are never stranded)
export async function broadcastOrderToAgents(
  orderId: string,
): Promise<{ broadcastCount: number }> {
  const order = await prisma.order.findUnique({ where: { id: orderId } });

  if (!order) {
    throw new Error("Order not found");
  }

  // --- ATTEMPT 1: Online agents with GPS near delivery location ---
  let agents: NearestAgentRow[] = [];
  let usedFallback = false;

  try {
    agents = await prisma.$queryRaw<NearestAgentRow[]>`
      SELECT * FROM get_nearest_agents(
        ${order.deliveryLatitude}::double precision,
        ${order.deliveryLongitude}::double precision,
        15
      )
    `;
  } catch (err: any) {
    console.error("get_nearest_agents PostGIS error:", err.message);
    agents = [];
  }

  // --- ATTEMPT 2: Online approved agents without location restriction ---
  if (agents.length === 0) {
    console.log(
      `[broadcast] No GPS-located agents for order ${order.orderNumber}. Trying online agents without location filter.`,
    );
    usedFallback = true;

    const onlineAgents = await prisma.deliveryAgent.findMany({
      where: {
        status: "approved",
        isOnline: true,
        user: { isBanned: false },
      },
      include: { user: { select: { id: true, fullName: true, mobile: true } } },
      take: 5,
    });

    agents = onlineAgents.map((a, idx) => ({
      agent_id: a.id,
      user_id: a.userId,
      full_name: a.user.fullName,
      mobile: a.user.mobile,
      vehicle_type: a.vehicleType,
      vehicle_number: a.vehicleNumber,
      current_latitude: a.currentLatitude,
      current_longitude: a.currentLongitude,
      distance_km: 0,
      rating_avg: Number(a.ratingAvg),
    }));
  }

  // --- ATTEMPT 3: Fallback — ANY approved agent (online or offline), take nearest 5 by rating ---
  if (agents.length === 0) {
    console.log(
      `[broadcast] No online agents for order ${order.orderNumber}. Broadcasting to nearest approved agents (offline fallback).`,
    );
    usedFallback = true;

    const allApprovedAgents = await prisma.deliveryAgent.findMany({
      where: {
        status: "approved",
        user: { isBanned: false },
      },
      include: { user: { select: { id: true, fullName: true, mobile: true } } },
      orderBy: { ratingAvg: "desc" },
      take: 5,
    });

    agents = allApprovedAgents.map((a) => ({
      agent_id: a.id,
      user_id: a.userId,
      full_name: a.user.fullName,
      mobile: a.user.mobile,
      vehicle_type: a.vehicleType,
      vehicle_number: a.vehicleNumber,
      current_latitude: a.currentLatitude,
      current_longitude: a.currentLongitude,
      distance_km: 0,
      rating_avg: Number(a.ratingAvg),
    }));
  }

  // No agents at all — notify admin
  if (agents.length === 0) {
    await notifyAdmins(
      "No agents available",
      `Order ${order.orderNumber} could not be broadcast — no approved agents found. Please assign an agent manually.`,
      "general",
    );
    return { broadcastCount: 0 };
  }

  const settingRecord = await prisma.appSetting.findUnique({
    where: { key: "assignment_timeout_seconds" },
  });
  const timeoutSeconds = settingRecord ? parseInt(settingRecord.value) : 90;
  const expiresAt = new Date(Date.now() + timeoutSeconds * 1000);

  // Use callback transaction for Prisma 5 compatibility
  await prisma.$transaction(async (tx) => {
    for (const agent of agents) {
      await tx.orderAssignment.upsert({
        where: {
          orderId_agentId: {
            orderId: order.id,
            agentId: agent.agent_id,
          },
        },
        update: {
          status: "broadcast",
          distanceKm: agent.distance_km || null,
          broadcastAt: new Date(),
          expiresAt,
          respondedAt: null,
        },
        create: {
          orderId: order.id,
          agentId: agent.agent_id,
          status: "broadcast",
          distanceKm: agent.distance_km || null,
          expiresAt,
        },
      });
    }

    await tx.order.update({
      where: { id: order.id },
      data: {
        status: "assigned",
        distanceKm: agents[0]?.distance_km > 0 ? agents[0].distance_km : null,
      },
    });
  });

  // Notify agents (outside transaction so notification failures don't roll back)
  for (const agent of agents) {
    try {
      const distanceText =
        agent.distance_km > 0 ? ` (${agent.distance_km} km away)` : "";
      const isOfflineNotice = usedFallback
        ? " Please go online to accept."
        : "";
      await notify({
        userId: agent.user_id,
        type: "order_placed",
        title: "New Delivery Request",
        message: `New order ${order.orderNumber} is available${distanceText}.${isOfflineNotice} Open the app to accept.`,
        orderId: order.id,
        sendEmail: true,
      });
    } catch (notifyErr: any) {
      console.warn(
        `[broadcast] Failed to notify agent ${agent.agent_id}:`,
        notifyErr.message,
      );
    }
  }

  console.log(
    `[broadcast] Order ${order.orderNumber} broadcast to ${agents.length} agent(s) (fallback: ${usedFallback})`,
  );
  return { broadcastCount: agents.length };
}

export async function acceptOrderAssignment(
  orderId: string,
  agentId: string,
): Promise<{ success: boolean; message: string }> {
  return prisma
    .$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id: orderId } });

      if (!order) {
        throw new Error("Order not found");
      }

      // Already accepted by someone else
      if (order.agentId && order.agentId !== agentId) {
        return {
          success: false,
          message: "This order has already been accepted by another agent.",
        };
      }

      if (order.status === "accepted" && order.agentId === agentId) {
        return {
          success: false,
          message: "You have already accepted this order.",
        };
      }

      const assignment = await tx.orderAssignment.findUnique({
        where: { orderId_agentId: { orderId, agentId } },
      });

      if (!assignment) {
        return {
          success: false,
          message: "This order was not broadcast to you.",
        };
      }

      if (assignment.status === "accepted") {
        return {
          success: false,
          message: "You have already accepted this order.",
        };
      }

      if (assignment.status !== "broadcast") {
        return {
          success: false,
          message: "This assignment is no longer available.",
        };
      }

      if (assignment.expiresAt < new Date()) {
        await tx.orderAssignment.update({
          where: { id: assignment.id },
          data: { status: "expired", respondedAt: new Date() },
        });
        return { success: false, message: "This assignment has expired." };
      }

      // Mark this agent's assignment as accepted
      await tx.orderAssignment.update({
        where: { id: assignment.id },
        data: { status: "accepted", respondedAt: new Date() },
      });

      // Expire all other agents' assignments for this order
      await tx.orderAssignment.updateMany({
        where: {
          orderId,
          agentId: { not: agentId },
          status: "broadcast",
        },
        data: { status: "expired", respondedAt: new Date() },
      });

      // Update the order
      await tx.order.update({
        where: { id: orderId },
        data: {
          agentId,
          status: "accepted",
          acceptedAt: new Date(),
        },
      });

      // Log status history
      await tx.orderStatusHistory.create({
        data: {
          orderId,
          status: "accepted",
          actorRole: "agent",
          note: "Agent accepted the order",
        },
      });

      return { success: true, message: "Order accepted successfully." };
    })
    .then(async (result) => {
      // Notify patient outside transaction
      if (result.success) {
        const updatedOrder = await prisma.order.findUnique({
          where: { id: orderId },
          include: { patient: { select: { id: true } } },
        });

        if (updatedOrder?.patient) {
          try {
            await notify({
              userId: updatedOrder.patient.id,
              type: "order_accepted",
              title: "Order Accepted",
              message: `Your order ${updatedOrder.orderNumber} has been accepted by a delivery agent and is being processed.`,
              orderId,
            });
          } catch (notifyErr: any) {
            console.warn(
              "Failed to notify patient of acceptance:",
              notifyErr.message,
            );
          }
        }
      }
      return result;
    });
}

export async function expireStaleAssignments(): Promise<number> {
  const now = new Date();

  // Expire broadcast assignments past their deadline
  const result = await prisma.orderAssignment.updateMany({
    where: {
      status: "broadcast",
      expiresAt: { lt: now },
    },
    data: { status: "expired" },
  });

  // Find orders still in 'assigned' status with no accepted agent that have
  // all assignments expired/rejected — re-broadcast them
  const staleOrders = await prisma.order.findMany({
    where: {
      status: "assigned",
      agentId: null,
    },
    include: {
      assignments: {
        where: { status: "broadcast" },
      },
    },
  });

  let reBroadcasted = 0;
  for (const order of staleOrders) {
    // Only re-broadcast if no active broadcast assignments remain
    if (order.assignments.length === 0) {
      console.log(
        `[cron] Re-broadcasting order ${order.orderNumber} (no active assignments)`,
      );
      const reBroadcast = await broadcastOrderToAgents(order.id);
      if (reBroadcast.broadcastCount === 0) {
        // No agents at all — fall back to pending so admin can handle
        await prisma.order.update({
          where: { id: order.id },
          data: { status: "pending" },
        });
      }
      reBroadcasted++;
    }
  }

  if (reBroadcasted > 0) {
    console.log(`[cron] Re-broadcast ${reBroadcasted} stale order(s)`);
  }

  return result.count;
}
