import { Request, Response } from "express";
import { prisma } from "../utils/prisma";
import {
  calculateDeliveryCharge,
  getTaxPercent,
  calculateTaxAmount,
} from "../services/charge.service";
import { broadcastOrderToAgents } from "../services/assignment.service";
import { notify } from "../services/notification.service";

interface NearestStoreRow {
  id: string;
  name: string;
  distance_km: number;
}

export async function createOrder(req: Request, res: Response) {
  try {
    const {
      addressId,
      familyMemberId,
      orderMethod,
      prescriptionImageUrls,
      items,
      notes,
      isUrgent,
    } = req.body;

    if (!addressId || !orderMethod) {
      return res
        .status(400)
        .json({ error: "addressId and orderMethod are required" });
    }

    if (!["prescription", "manual"].includes(orderMethod)) {
      return res
        .status(400)
        .json({ error: 'orderMethod must be "prescription" or "manual"' });
    }

    if (
      orderMethod === "prescription" &&
      (!prescriptionImageUrls || prescriptionImageUrls.length === 0)
    ) {
      return res.status(400).json({
        error: "prescriptionImageUrls is required for prescription orders",
      });
    }

    if (orderMethod === "manual" && (!items || items.length === 0)) {
      return res
        .status(400)
        .json({ error: "items array is required for manual orders" });
    }

    const address = await prisma.address.findUnique({
      where: { id: addressId },
    });
    if (!address || address.userId !== req.user!.id) {
      return res.status(404).json({ error: "Address not found" });
    }

    if (address.latitude == null || address.longitude == null) {
      return res.status(400).json({
        error:
          'Selected address does not have GPS coordinates set. Please edit the address and use "Use my current location" to add coordinates.',
      });
    }

    if (familyMemberId) {
      const familyMember = await prisma.familyMember.findUnique({
        where: { id: familyMemberId },
      });
      if (!familyMember || familyMember.userId !== req.user!.id) {
        return res.status(404).json({ error: "Family member not found" });
      }
    }

    // Find nearest store using PostGIS
    const nearestStores = await prisma.$queryRaw<NearestStoreRow[]>`
      SELECT id, name, ROUND((ST_Distance(
        location,
        ST_SetSRID(ST_MakePoint(${address.longitude}::double precision, ${address.latitude}::double precision), 4326)::geography
      ) / 1000)::numeric, 2) AS distance_km
      FROM medical_stores
      WHERE is_active = TRUE
        AND location IS NOT NULL
      ORDER BY location <-> ST_SetSRID(ST_MakePoint(${address.longitude}::double precision, ${address.latitude}::double precision), 4326)::geography
      LIMIT 1
    `;

    const nearestStore = nearestStores[0];
    // Use store distance if available, otherwise default to 3km for charge calculation
    const distanceKm = nearestStore ? Number(nearestStore.distance_km) : 3;

    const chargeBreakdown = await calculateDeliveryCharge(
      distanceKm,
      !!isUrgent,
    );
    const taxPercent = await getTaxPercent();

    let medicineCost = 0;
    if (orderMethod === "manual" && items) {
      medicineCost = items.reduce(
        (sum: number, item: any) =>
          sum + (Number(item.unitPrice) || 0) * (Number(item.quantity) || 1),
        0,
      );
    }

    const taxAmount = calculateTaxAmount(medicineCost, taxPercent);
    const totalAmount =
      medicineCost + chargeBreakdown.totalDeliveryCharge + taxAmount;

    const orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    const order = await prisma.order.create({
      data: {
        orderNumber,
        patientId: req.user!.id,
        familyMemberId: familyMemberId ?? null,
        storeId: nearestStore?.id ?? null,
        addressId,
        orderMethod,
        prescriptionImageUrls: prescriptionImageUrls ?? [],
        notes: notes ?? null,
        isUrgent: !!isUrgent,
        deliveryLatitude: address.latitude,
        deliveryLongitude: address.longitude,
        distanceKm,
        status: "pending",
        paymentStatus: "pending",
        medicineCost: orderMethod === "manual" ? medicineCost : null,
        deliveryCharge: chargeBreakdown.totalDeliveryCharge,
        baseCharge: chargeBreakdown.baseCharge,
        platformCharge: chargeBreakdown.platformCharge,
        urgentCharge: chargeBreakdown.urgentCharge,
        taxAmount: orderMethod === "manual" ? taxAmount : 0,
        totalAmount: orderMethod === "manual" ? totalAmount : null,
        items:
          orderMethod === "manual" && items
            ? {
                create: items.map((item: any) => ({
                  medicineName: item.medicineName,
                  quantity: Number(item.quantity) || 1,
                  unitPrice: item.unitPrice ? Number(item.unitPrice) : null,
                  imageUrl: item.imageUrl ?? null,
                  notes: item.notes ?? null,
                })),
              }
            : undefined,
      },
      include: { items: true },
    });

    notify({
      userId: req.user!.id,
      type: "order_placed",
      title: "Order Placed",
      message: `Your order ${order.orderNumber} has been placed successfully. We are finding a delivery agent for you.`,
      orderId: order.id,
    }).catch(console.error);

    // Don't await — fire and forget
    broadcastOrderToAgents(order.id).catch(console.error);

    return res.status(201).json({
      order,
      agentsNotified: 0,
      message: "Order placed successfully.",
    });
  } catch (err: any) {
    console.error("createOrder error:", err);
    return res.status(500).json({ error: "Failed to create order" });
  }
}

export async function getOrder(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: true,
        address: true,
        familyMember: true,
        store: true,
        agent: { include: { user: true } },
        statusHistory: { orderBy: { createdAt: "asc" } },
        invoice: true,
        rating: true,
        assignments: true,
        patient: {
          select: { id: true, fullName: true, mobile: true, email: true },
        },
      },
    });

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    const isOwner = order.patientId === req.user!.id;
    const isAgent =
      order.agentId != null && order.agentId === req.user!.agentId;
    const isAdmin = req.user!.role === "admin";

    if (!isOwner && !isAgent && !isAdmin) {
      return res
        .status(403)
        .json({ error: "You do not have access to this order" });
    }

    return res.json({ order });
  } catch (err: any) {
    console.error("getOrder error:", err);
    return res.status(500).json({ error: "Failed to fetch order" });
  }
}

export async function listMyOrders(req: Request, res: Response) {
  try {
    const { status } = req.query;

    const activeStatuses = [
      "pending",
      "assigned",
      "accepted",
      "purchasing",
      "bill_uploaded",
      "out_for_delivery",
    ];
    const historyStatuses = ["delivered", "cancelled", "expired"];

    let statusFilter: any = undefined;

    if (status === "active") {
      statusFilter = { in: activeStatuses };
    } else if (status === "history") {
      statusFilter = { in: historyStatuses };
    } else if (typeof status === "string" && status !== "") {
      statusFilter = status;
    }

    const orders = await prisma.order.findMany({
      where: {
        patientId: req.user!.id,
        ...(statusFilter !== undefined ? { status: statusFilter } : {}),
      },
      include: {
        items: true,
        agent: {
          include: { user: { select: { fullName: true, mobile: true } } },
        },
        store: { select: { name: true } },
        rating: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return res.json({ orders });
  } catch (err: any) {
    console.error("listMyOrders error:", err);
    return res.status(500).json({ error: "Failed to fetch orders" });
  }
}

// FIX 1: cancelOrder — use callback-form transaction, not array form
// Array-form transactions with updateMany are unreliable in Prisma 5
export async function cancelOrder(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    // Step 1: fetch the order
    const order = await prisma.order.findUnique({
      where: { id },
      include: { agent: { select: { userId: true } } },
    });

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    if (order.patientId !== req.user!.id) {
      return res
        .status(403)
        .json({ error: "You do not have permission to cancel this order" });
    }

    const cancellableStatuses = ["pending", "assigned", "accepted"];
    if (!cancellableStatuses.includes(order.status)) {
      return res.status(400).json({
        error: `Order cannot be cancelled. Current status is "${order.status}". Only pending, assigned or accepted orders can be cancelled.`,
      });
    }

    // Step 2: cancel the order (NO transaction - works with PgBouncer)
    await prisma.order.update({
      where: { id },
      data: {
        status: "cancelled",
        cancelledAt: new Date(),
      },
    });

    // Step 3: log it (non-critical, ignore failure)
    await prisma.orderStatusHistory
      .create({
        data: {
          orderId: id,
          status: "cancelled",
          actorId: req.user!.id,
          actorRole: "patient",
          note: reason || "Cancelled by patient",
        },
      })
      .catch((e: any) =>
        console.warn("status history insert failed (non-critical):", e.message),
      );

    // Step 4: expire broadcast assignments (non-critical, cron will clean up anyway)
    await prisma.orderAssignment
      .updateMany({
        where: { orderId: id, status: "broadcast" },
        data: { status: "expired" },
      })
      .catch((e: any) =>
        console.warn("assignment expire failed (non-critical):", e.message),
      );

    // Step 5: notify agent if one was assigned
    if (order.agent?.userId) {
      await notify({
        userId: order.agent.userId,
        type: "general",
        title: "Order Cancelled",
        message: `Order ${order.orderNumber} has been cancelled by the patient.`,
        orderId: id,
        sendEmail: false,
      }).catch(() => {});
    }

    return res.json({ message: "Order cancelled successfully" });
  } catch (err: any) {
    console.error("cancelOrder error:", err.message, err.code, err.meta);
    return res
      .status(500)
      .json({ error: err.message || "Failed to cancel order" });
  }
}

export async function rateOrder(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { rating, review } = req.body;

    if (!rating || Number(rating) < 1 || Number(rating) > 5) {
      return res.status(400).json({ error: "rating must be between 1 and 5" });
    }

    const order = await prisma.order.findUnique({ where: { id } });

    if (!order || order.patientId !== req.user!.id) {
      return res.status(404).json({ error: "Order not found" });
    }

    if (order.status !== "delivered") {
      return res
        .status(400)
        .json({ error: "You can only rate delivered orders" });
    }

    if (!order.agentId) {
      return res
        .status(400)
        .json({ error: "No delivery agent assigned to this order" });
    }

    const existingRating = await prisma.orderRating.findUnique({
      where: { orderId: id },
    });
    if (existingRating) {
      return res
        .status(409)
        .json({ error: "You have already rated this order" });
    }

    const orderRating = await prisma.$transaction(async (tx) => {
      const created = await tx.orderRating.create({
        data: {
          orderId: id,
          patientId: req.user!.id,
          agentId: order.agentId!,
          rating: Number(rating),
          review: review ?? null,
        },
      });

      const agent = await tx.deliveryAgent.findUnique({
        where: { id: order.agentId! },
      });
      if (agent) {
        const newCount = agent.ratingCount + 1;
        const newAvg =
          (Number(agent.ratingAvg) * agent.ratingCount + Number(rating)) /
          newCount;

        await tx.deliveryAgent.update({
          where: { id: agent.id },
          data: {
            ratingCount: newCount,
            ratingAvg: Math.round(newAvg * 100) / 100,
          },
        });
      }

      return created;
    });

    return res.status(201).json({ rating: orderRating });
  } catch (err: any) {
    console.error("rateOrder error:", err);
    return res.status(500).json({ error: "Failed to submit rating" });
  }
}

export async function getChargePreview(req: Request, res: Response) {
  try {
    const { addressId, isUrgent } = req.query;

    if (!addressId) {
      return res.status(400).json({ error: "addressId is required" });
    }

    const address = await prisma.address.findUnique({
      where: { id: addressId as string },
    });

    if (!address || address.userId !== req.user!.id) {
      return res.status(404).json({ error: "Address not found" });
    }

    if (address.latitude == null || address.longitude == null) {
      return res.status(400).json({ error: "Address has no GPS coordinates" });
    }

    const nearestStores = await prisma.$queryRaw<NearestStoreRow[]>`
      SELECT id, name, ROUND((ST_Distance(
        location,
        ST_SetSRID(ST_MakePoint(${address.longitude}::double precision, ${address.latitude}::double precision), 4326)::geography
      ) / 1000)::numeric, 2) AS distance_km
      FROM medical_stores
      WHERE is_active = TRUE AND location IS NOT NULL
      ORDER BY location <-> ST_SetSRID(ST_MakePoint(${address.longitude}::double precision, ${address.latitude}::double precision), 4326)::geography
      LIMIT 1
    `;

    const distanceKm = nearestStores[0]
      ? Number(nearestStores[0].distance_km)
      : 3;
    const urgent = isUrgent === "true";
    const chargeBreakdown = await calculateDeliveryCharge(distanceKm, urgent);

    return res.json({
      distanceKm,
      ...chargeBreakdown,
    });
  } catch (err: any) {
    console.error("getChargePreview error:", err);
    return res.status(500).json({ error: "Failed to calculate charges" });
  }
}
