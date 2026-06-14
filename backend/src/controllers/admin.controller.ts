//admin.controller.ts
import { Request, Response } from "express";
import { prisma } from "../utils/prisma";
import { notify } from "../services/notification.service";

async function logAudit(
  actorId: string,
  actorRole: "admin",
  action: string,
  entityType: string,
  entityId: string,
  oldValue: any = null,
  newValue: any = null,
) {
  await prisma.auditLog.create({
    data: {
      actorId,
      actorRole,
      action,
      entityType,
      entityId,
      oldValue,
      newValue,
    },
  });
}

export async function getDashboard(req: Request, res: Response) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [
      totalOrdersToday,
      deliveredToday,
      activeOrders,
      totalPatients,
      totalAgents,
      pendingAgents,
      activeAgentsOnline,
      revenueToday,
      openComplaints,
    ] = await Promise.all([
      prisma.order.count({
        where: { createdAt: { gte: today, lt: tomorrow } },
      }),
      prisma.order.count({
        where: {
          status: "delivered",
          deliveredAt: { gte: today, lt: tomorrow },
        },
      }),
      prisma.order.count({
        where: {
          status: {
            in: [
              "pending",
              "assigned",
              "accepted",
              "purchasing",
              "bill_uploaded",
              "out_for_delivery",
            ],
          },
        },
      }),
      prisma.user.count({ where: { role: "patient" } }),
      prisma.deliveryAgent.count({ where: { status: "approved" } }),
      prisma.deliveryAgent.count({ where: { status: "pending" } }),
      prisma.deliveryAgent.count({
        where: { status: "approved", isOnline: true },
      }),
      prisma.order.aggregate({
        where: {
          status: "delivered",
          deliveredAt: { gte: today, lt: tomorrow },
        },
        _sum: { totalAmount: true, deliveryCharge: true, platformCharge: true },
      }),
      prisma.complaint.count({ where: { status: "open" } }),
    ]);

    return res.json({
      ordersToday: totalOrdersToday,
      deliveredToday,
      activeOrders,
      totalPatients,
      totalAgents,
      pendingAgents,
      activeAgentsOnline,
      revenueToday: Number(revenueToday._sum.totalAmount ?? 0),
      deliveryChargesToday: Number(revenueToday._sum.deliveryCharge ?? 0),
      platformChargesToday: Number(revenueToday._sum.platformCharge ?? 0),
      openComplaints,
    });
  } catch (err: any) {
    console.error("getDashboard error:", err);
    return res.status(500).json({ error: "Failed to fetch dashboard data" });
  }
}

export async function listUsers(req: Request, res: Response) {
  try {
    const { role, search } = req.query;

    const users = await prisma.user.findMany({
      where: {
        ...(role && role !== "all" ? { role: role as any } : {}),
        ...(search
          ? {
              OR: [
                {
                  fullName: { contains: search as string, mode: "insensitive" },
                },
                { email: { contains: search as string, mode: "insensitive" } },
                { mobile: { contains: search as string } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    return res.json({ users });
  } catch (err: any) {
    console.error("listUsers error:", err);
    return res.status(500).json({ error: "Failed to fetch users" });
  }
}

export async function toggleBanUser(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { isBanned } = req.body;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.role === "admin") {
      return res.status(400).json({ error: "Cannot ban an admin account" });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { isBanned: !!isBanned },
    });

    await logAudit(
      req.user!.id,
      "admin",
      isBanned ? "BAN_USER" : "UNBAN_USER",
      "user",
      id,
      { isBanned: user.isBanned },
      { isBanned: !!isBanned },
    );

    return res.json({
      message: `User ${isBanned ? "banned" : "unbanned"} successfully`,
      user: updated,
    });
  } catch (err: any) {
    console.error("toggleBanUser error:", err);
    return res.status(500).json({ error: "Failed to update user" });
  }
}

export async function listAgents(req: Request, res: Response) {
  try {
    const { status } = req.query;

    const agents = await prisma.deliveryAgent.findMany({
      where: status && status !== "all" ? { status: status as any } : {},
      include: { user: true },
      orderBy: { createdAt: "desc" },
    });

    return res.json({ agents });
  } catch (err: any) {
    console.error("listAgents error:", err);
    return res.status(500).json({ error: "Failed to fetch agents" });
  }
}

export async function approveAgent(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const agent = await prisma.deliveryAgent.findUnique({
      where: { id },
      include: { user: true },
    });
    if (!agent) {
      return res.status(404).json({ error: "Agent not found" });
    }

    const updated = await prisma.deliveryAgent.update({
      where: { id },
      data: {
        status: "approved",
        approvedBy: req.user!.id,
        approvedAt: new Date(),
      },
    });

    await notify({
      userId: agent.userId,
      type: "registration",
      title: "Agent Application Approved",
      message:
        "Congratulations! Your delivery agent application has been approved. You can now go online and start accepting orders.",
    });

    await logAudit(
      req.user!.id,
      "admin",
      "APPROVE_AGENT",
      "delivery_agent",
      id,
      { status: agent.status },
      { status: "approved" },
    );

    return res.json({ message: "Agent approved successfully", agent: updated });
  } catch (err: any) {
    console.error("approveAgent error:", err);
    return res.status(500).json({ error: "Failed to approve agent" });
  }
}

export async function rejectAgent(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const agent = await prisma.deliveryAgent.findUnique({
      where: { id },
      include: { user: true },
    });
    if (!agent) {
      return res.status(404).json({ error: "Agent not found" });
    }

    const updated = await prisma.deliveryAgent.update({
      where: { id },
      data: { status: "rejected" },
    });

    await notify({
      userId: agent.userId,
      type: "registration",
      title: "Agent Application Rejected",
      message: reason
        ? `Your delivery agent application was rejected. Reason: ${reason}`
        : "Your delivery agent application was rejected. Please contact support for more details.",
    });

    await logAudit(
      req.user!.id,
      "admin",
      "REJECT_AGENT",
      "delivery_agent",
      id,
      { status: agent.status },
      { status: "rejected" },
    );

    return res.json({ message: "Agent rejected", agent: updated });
  } catch (err: any) {
    console.error("rejectAgent error:", err);
    return res.status(500).json({ error: "Failed to reject agent" });
  }
}

export async function banAgent(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { isBanned } = req.body;

    const agent = await prisma.deliveryAgent.findUnique({
      where: { id },
      include: { user: true },
    });
    if (!agent) {
      return res.status(404).json({ error: "Agent not found" });
    }

    await prisma.$transaction([
      prisma.deliveryAgent.update({
        where: { id },
        data: { status: isBanned ? "banned" : "approved", isOnline: false },
      }),
      prisma.user.update({
        where: { id: agent.userId },
        data: { isBanned: !!isBanned },
      }),
    ]);

    await logAudit(
      req.user!.id,
      "admin",
      isBanned ? "BAN_AGENT" : "UNBAN_AGENT",
      "delivery_agent",
      id,
      null,
      { isBanned },
    );

    return res.json({
      message: `Agent ${isBanned ? "banned" : "unbanned"} successfully`,
    });
  } catch (err: any) {
    console.error("banAgent error:", err);
    return res.status(500).json({ error: "Failed to update agent status" });
  }
}

export async function listStores(req: Request, res: Response) {
  try {
    const stores = await prisma.medicalStore.findMany({
      orderBy: { createdAt: "desc" },
    });
    return res.json({ stores });
  } catch (err: any) {
    console.error("listStores error:", err);
    return res.status(500).json({ error: "Failed to fetch stores" });
  }
}

export async function createStore(req: Request, res: Response) {
  try {
    const {
      name,
      ownerName,
      phone,
      addressLine,
      city,
      state,
      pincode,
      latitude,
      longitude,
      licenseNumber,
      opensAt,
      closesAt,
    } = req.body;

    if (
      !name ||
      !phone ||
      !addressLine ||
      !city ||
      !state ||
      !pincode ||
      latitude === undefined ||
      longitude === undefined
    ) {
      return res.status(400).json({ error: "Missing required store fields" });
    }

    const store = await prisma.medicalStore.create({
      data: {
        name,
        ownerName: ownerName ?? null,
        phone,
        addressLine,
        city,
        state,
        pincode,
        latitude,
        longitude,
        licenseNumber: licenseNumber ?? null,
        opensAt: opensAt ?? null,
        closesAt: closesAt ?? null,
        isActive: true,
      },
    });

    await logAudit(
      req.user!.id,
      "admin",
      "CREATE_STORE",
      "medical_store",
      store.id,
      null,
      store,
    );

    return res.status(201).json({ store });
  } catch (err: any) {
    console.error("createStore error:", err);
    return res.status(500).json({ error: "Failed to create store" });
  }
}

export async function updateStore(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const data = req.body;

    const existing = await prisma.medicalStore.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: "Store not found" });
    }

    const store = await prisma.medicalStore.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.ownerName !== undefined ? { ownerName: data.ownerName } : {}),
        ...(data.phone !== undefined ? { phone: data.phone } : {}),
        ...(data.addressLine !== undefined
          ? { addressLine: data.addressLine }
          : {}),
        ...(data.city !== undefined ? { city: data.city } : {}),
        ...(data.state !== undefined ? { state: data.state } : {}),
        ...(data.pincode !== undefined ? { pincode: data.pincode } : {}),
        ...(data.latitude !== undefined ? { latitude: data.latitude } : {}),
        ...(data.longitude !== undefined ? { longitude: data.longitude } : {}),
        ...(data.licenseNumber !== undefined
          ? { licenseNumber: data.licenseNumber }
          : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
        ...(data.opensAt !== undefined ? { opensAt: data.opensAt } : {}),
        ...(data.closesAt !== undefined ? { closesAt: data.closesAt } : {}),
      },
    });

    await logAudit(
      req.user!.id,
      "admin",
      "UPDATE_STORE",
      "medical_store",
      id,
      existing,
      store,
    );

    return res.json({ store });
  } catch (err: any) {
    console.error("updateStore error:", err);
    return res.status(500).json({ error: "Failed to update store" });
  }
}

export async function deleteStore(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const existing = await prisma.medicalStore.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: "Store not found" });
    }

    await prisma.medicalStore.delete({ where: { id } });

    await logAudit(
      req.user!.id,
      "admin",
      "DELETE_STORE",
      "medical_store",
      id,
      existing,
      null,
    );

    return res.json({ message: "Store deleted" });
  } catch (err: any) {
    console.error("deleteStore error:", err);
    return res
      .status(500)
      .json({
        error: "Failed to delete store. It may have associated orders.",
      });
  }
}

export async function listAllOrders(req: Request, res: Response) {
  try {
    const { status, page = "1", limit = "50" } = req.query;

    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = Math.min(parseInt(limit as string, 10) || 50, 100);

    const where = status && status !== "all" ? { status: status as any } : {};

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          patient: { select: { fullName: true, mobile: true } },
          agent: {
            include: { user: { select: { fullName: true, mobile: true } } },
          },
          store: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      prisma.order.count({ where }),
    ]);

    return res.json({ orders, total, page: pageNum, limit: limitNum });
  } catch (err: any) {
    console.error("listAllOrders error:", err);
    return res.status(500).json({ error: "Failed to fetch orders" });
  }
}

export async function listComplaints(req: Request, res: Response) {
  try {
    const { status } = req.query;

    const complaints = await prisma.complaint.findMany({
      where: status && status !== "all" ? { status: status as any } : {},
      include: {
        user: { select: { fullName: true, email: true, mobile: true } },
        order: { select: { orderNumber: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.json({ complaints });
  } catch (err: any) {
    console.error("listComplaints error:", err);
    return res.status(500).json({ error: "Failed to fetch complaints" });
  }
}

export async function updateComplaint(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { status, adminResponse } = req.body;

    const validStatuses = ["open", "in_progress", "resolved"];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid status value" });
    }

    const complaint = await prisma.complaint.findUnique({ where: { id } });
    if (!complaint) {
      return res.status(404).json({ error: "Complaint not found" });
    }

    const updated = await prisma.complaint.update({
      where: { id },
      data: {
        ...(status ? { status } : {}),
        ...(adminResponse !== undefined ? { adminResponse } : {}),
        ...(status === "resolved"
          ? { resolvedBy: req.user!.id, resolvedAt: new Date() }
          : {}),
      },
    });

    await notify({
      userId: complaint.userId,
      type: "complaint",
      title: "Complaint Update",
      message: `Your complaint (Ticket #${complaint.ticketNumber}) status has been updated to "${updated.status}".${
        adminResponse ? ` Response: ${adminResponse}` : ""
      }`,
    });

    return res.json({ complaint: updated });
  } catch (err: any) {
    console.error("updateComplaint error:", err);
    return res.status(500).json({ error: "Failed to update complaint" });
  }
}

export async function getRevenueAnalytics(req: Request, res: Response) {
  try {
    const { from, to } = req.query;

    const fromDate = from
      ? new Date(from as string)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const toDate = to ? new Date(`${to}T23:59:59.999Z`) : new Date();

    const metrics = await prisma.dailyMetric.findMany({
      where: { metricDate: { gte: fromDate, lte: toDate } },
      orderBy: { metricDate: "asc" },
    });

    const totals = await prisma.order.aggregate({
      where: {
        status: "delivered",
        deliveredAt: { gte: fromDate, lte: toDate },
      },
      _sum: {
        totalAmount: true,
        medicineCost: true,
        deliveryCharge: true,
        platformCharge: true,
        taxAmount: true,
      },
      _count: true,
    });

    return res.json({
      metrics,
      totals: {
        totalRevenue: Number(totals._sum.totalAmount ?? 0),
        medicineCost: Number(totals._sum.medicineCost ?? 0),
        deliveryCharges: Number(totals._sum.deliveryCharge ?? 0),
        platformCharges: Number(totals._sum.platformCharge ?? 0),
        tax: Number(totals._sum.taxAmount ?? 0),
        deliveredOrders: totals._count,
      },
    });
  } catch (err: any) {
    console.error("getRevenueAnalytics error:", err);
    return res.status(500).json({ error: "Failed to fetch revenue analytics" });
  }
}

export async function listChargeRules(req: Request, res: Response) {
  try {
    const rules = await prisma.deliveryChargeRule.findMany({
      orderBy: { minDistanceKm: "asc" },
    });
    const settings = await prisma.appSetting.findMany();

    return res.json({ rules, settings });
  } catch (err: any) {
    console.error("listChargeRules error:", err);
    return res.status(500).json({ error: "Failed to fetch charge rules" });
  }
}

export async function updateChargeRule(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { minDistanceKm, maxDistanceKm, charge, isActive } = req.body;

    const existing = await prisma.deliveryChargeRule.findUnique({
      where: { id },
    });
    if (!existing) {
      return res.status(404).json({ error: "Charge rule not found" });
    }

    const rule = await prisma.deliveryChargeRule.update({
      where: { id },
      data: {
        ...(minDistanceKm !== undefined ? { minDistanceKm } : {}),
        ...(maxDistanceKm !== undefined ? { maxDistanceKm } : {}),
        ...(charge !== undefined ? { charge } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
      },
    });

    await logAudit(
      req.user!.id,
      "admin",
      "UPDATE_CHARGE_RULE",
      "delivery_charge_rule",
      id,
      existing,
      rule,
    );

    return res.json({ rule });
  } catch (err: any) {
    console.error("updateChargeRule error:", err);
    return res.status(500).json({ error: "Failed to update charge rule" });
  }
}

export async function createChargeRule(req: Request, res: Response) {
  try {
    const { minDistanceKm, maxDistanceKm, charge, isActive } = req.body;

    if (
      minDistanceKm === undefined ||
      maxDistanceKm === undefined ||
      charge === undefined
    ) {
      return res
        .status(400)
        .json({
          error: "minDistanceKm, maxDistanceKm and charge are required",
        });
    }

    const rule = await prisma.deliveryChargeRule.create({
      data: {
        minDistanceKm,
        maxDistanceKm,
        charge,
        isActive: isActive ?? true,
      },
    });

    await logAudit(
      req.user!.id,
      "admin",
      "CREATE_CHARGE_RULE",
      "delivery_charge_rule",
      rule.id,
      null,
      rule,
    );

    return res.status(201).json({ rule });
  } catch (err: any) {
    console.error("createChargeRule error:", err);
    return res.status(500).json({ error: "Failed to create charge rule" });
  }
}

export async function updateAppSetting(req: Request, res: Response) {
  try {
    const { key } = req.params;
    const { value } = req.body;

    if (value === undefined) {
      return res.status(400).json({ error: "value is required" });
    }

    const setting = await prisma.appSetting.upsert({
      where: { key },
      update: { value: String(value) },
      create: { key, value: String(value), description: null },
    });

    await logAudit(
      req.user!.id,
      "admin",
      "UPDATE_APP_SETTING",
      "app_setting",
      key,
      null,
      setting,
    );

    return res.json({ setting });
  } catch (err: any) {
    console.error("updateAppSetting error:", err);
    return res.status(500).json({ error: "Failed to update setting" });
  }
}
// ADD this function to the bottom of backend/src/controllers/admin.controller.ts
// It allows admins to manually assign any approved agent to any pending/assigned order

import { broadcastOrderToAgents } from '../services/assignment.service';

export async function manualAssignAgent(req: Request, res: Response) {
  try {
    const { orderId } = req.params;
    const { agentId } = req.body;

    if (!agentId) {
      return res.status(400).json({ error: 'agentId is required' });
    }

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (!['pending', 'assigned'].includes(order.status)) {
      return res.status(400).json({ error: `Order status "${order.status}" cannot be manually assigned` });
    }

    const agent = await prisma.deliveryAgent.findUnique({
      where: { id: agentId },
      include: { user: true },
    });

    if (!agent || agent.status !== 'approved') {
      return res.status(404).json({ error: 'Approved agent not found' });
    }

    const expiresAt = new Date(Date.now() + 90 * 1000);

    await prisma.$transaction(async (tx) => {
      await tx.orderAssignment.upsert({
        where: { orderId_agentId: { orderId, agentId } },
        update: { status: 'broadcast', broadcastAt: new Date(), expiresAt, respondedAt: null },
        create: { orderId, agentId, status: 'broadcast', expiresAt },
      });

      await tx.order.update({
        where: { id: orderId },
        data: { status: 'assigned' },
      });
    });

    const { notify } = await import('../services/notification.service');
    await notify({
      userId: agent.userId,
      type: 'order_placed',
      title: 'New Delivery Request (Admin Assigned)',
      message: `Order ${order.orderNumber} has been assigned to you by admin. Please accept it in the app.`,
      orderId,
      sendEmail: true,
    });

    await logAudit(req.user!.id, 'admin', 'MANUAL_ASSIGN_AGENT', 'order', orderId, { agentId: null }, { agentId });

    return res.json({ message: `Order assigned to ${agent.user.fullName}` });
  } catch (err: any) {
    console.error('manualAssignAgent error:', err);
    return res.status(500).json({ error: 'Failed to assign agent' });
  }
}

export async function reBroadcastOrder(req: Request, res: Response) {
  try {
    const { orderId } = req.params;

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (!['pending', 'assigned'].includes(order.status)) {
      return res.status(400).json({ error: `Order status "${order.status}" cannot be re-broadcast` });
    }

    const result = await broadcastOrderToAgents(orderId);

    return res.json({
      message: `Order re-broadcast to ${result.broadcastCount} agent(s)`,
      agentsNotified: result.broadcastCount,
    });
  } catch (err: any) {
    console.error('reBroadcastOrder error:', err);
    return res.status(500).json({ error: 'Failed to re-broadcast order' });
  }
}

export async function listAuditLogs(req: Request, res: Response) {
  try {
    const { page = "1", limit = "50" } = req.query;
    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = Math.min(parseInt(limit as string, 10) || 50, 100);

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        include: { actor: { select: { fullName: true, email: true } } },
        orderBy: { createdAt: "desc" },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      prisma.auditLog.count(),
    ]);

    return res.json({ logs, total, page: pageNum, limit: limitNum });
  } catch (err: any) {
    console.error("listAuditLogs error:", err);
    return res.status(500).json({ error: "Failed to fetch audit logs" });
  }
}
export async function listAgentEarnings(req: Request, res: Response) {
  try {
    const { agentId, payoutStatus } = req.query;

    const earnings = await prisma.agentEarning.findMany({
      where: {
        ...(agentId ? { agentId: agentId as string } : {}),
        ...(payoutStatus ? { payoutStatus: payoutStatus as any } : {}),
      },
      include: {
        agent: {
          include: { user: { select: { fullName: true, mobile: true } } },
        },
        order: { select: { orderNumber: true, deliveredAt: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const totalPending = earnings
      .filter((e) => e.payoutStatus === "pending")
      .reduce((sum, e) => sum + Number(e.amount), 0);

    return res.json({ earnings, totalPending });
  } catch (err: any) {
    console.error("listAgentEarnings error:", err);
    return res.status(500).json({ error: "Failed to fetch earnings" });
  }
}

export async function markEarningPaid(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { transactionRef } = req.body;

    const earning = await prisma.agentEarning.findUnique({ where: { id } });
    if (!earning) return res.status(404).json({ error: "Earning not found" });
    if (earning.payoutStatus === "paid") {
      return res.status(400).json({ error: "Already marked as paid" });
    }

    const updated = await prisma.agentEarning.update({
      where: { id },
      data: {
        payoutStatus: "paid",
        paidAt: new Date(),
        transactionRef: transactionRef ?? null,
      },
    });

    await logAudit(
      req.user!.id,
      "admin",
      "MARK_EARNING_PAID",
      "agent_earning",
      id,
      { payoutStatus: "pending" },
      { payoutStatus: "paid", transactionRef },
    );

    return res.json({ earning: updated });
  } catch (err: any) {
    console.error("markEarningPaid error:", err);
    return res.status(500).json({ error: "Failed to mark earning as paid" });
  }
}
