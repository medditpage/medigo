import { Request, Response } from "express";
import { prisma } from "../utils/prisma";
import { acceptOrderAssignment } from "../services/assignment.service";
import { generateInvoice } from "../services/invoice.service";
import { calculateTaxAmount, getTaxPercent } from "../services/charge.service";
import { notify, notifyAdmins } from "../services/notification.service";
import { uploadBuffer, STORAGE_BUCKETS } from "../utils/supabase";
export async function toggleOnline(req: Request, res: Response) {
  try {
    const { isOnline, latitude, longitude } = req.body;

    const agent = await prisma.deliveryAgent.findUnique({
      where: { userId: req.user!.id },
    });
    if (!agent) {
      return res.status(404).json({ error: "Agent profile not found" });
    }

    const updated = await prisma.deliveryAgent.update({
      where: { id: agent.id },
      data: {
        isOnline: !!isOnline,
        ...(latitude !== undefined ? { currentLatitude: latitude } : {}),
        ...(longitude !== undefined ? { currentLongitude: longitude } : {}),
      },
    });

    return res.json({ agent: updated });
  } catch (err: any) {
    console.error("toggleOnline error:", err);
    return res.status(500).json({ error: "Failed to update status" });
  }
}

export async function uploadBillFile(req: Request, res: Response) {
  try {
    const { orderId } = req.params;
    const agentId = req.user!.agentId!;

    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order || order.agentId !== agentId) {
      return res
        .status(404)
        .json({ error: "Order not found or not assigned to you" });
    }

    const ext = req.file.mimetype === "application/pdf" ? "pdf" : "jpg";
    const path = `${orderId}/bill-${Date.now()}.${ext}`;

    const url = await uploadBuffer(
      STORAGE_BUCKETS.BILLS,
      path,
      req.file.buffer,
      req.file.mimetype,
    );

    return res.json({ url });
  } catch (err: any) {
    console.error("uploadBillFile error:", err);
    return res.status(500).json({ error: "Failed to upload bill" });
  }
}

export async function updateLocation(req: Request, res: Response) {
  try {
    const { latitude, longitude } = req.body;

    if (latitude === undefined || longitude === undefined) {
      return res
        .status(400)
        .json({ error: "latitude and longitude are required" });
    }

    const agent = await prisma.deliveryAgent.findUnique({
      where: { userId: req.user!.id },
    });
    if (!agent) {
      return res.status(404).json({ error: "Agent profile not found" });
    }

    await prisma.deliveryAgent.update({
      where: { id: agent.id },
      data: { currentLatitude: latitude, currentLongitude: longitude },
    });

    return res.json({ message: "Location updated" });
  } catch (err: any) {
    console.error("updateLocation error:", err);
    return res.status(500).json({ error: "Failed to update location" });
  }
}

export async function getIncomingOrders(req: Request, res: Response) {
  try {
    const agentId = req.user!.agentId!;

    const assignments = await prisma.orderAssignment.findMany({
      where: {
        agentId,
        status: "broadcast",
        expiresAt: { gt: new Date() },
      },
      include: {
        order: {
          include: {
            items: true,
            address: true,
            patient: { select: { fullName: true, mobile: true } },
          },
        },
      },
      orderBy: { broadcastAt: "desc" },
    });

    const incoming = assignments
      .filter((a) => a.order.status === "assigned" && !a.order.agentId)
      .map((a) => ({
        assignmentId: a.id,
        distanceKm: a.distanceKm,
        expiresAt: a.expiresAt,
        order: a.order,
      }));

    return res.json({ incoming });
  } catch (err: any) {
    console.error("getIncomingOrders error:", err);
    return res.status(500).json({ error: "Failed to fetch incoming orders" });
  }
}

export async function acceptOrder(req: Request, res: Response) {
  try {
    const { orderId } = req.params;
    const agentId = req.user!.agentId!;

    const result = await acceptOrderAssignment(orderId, agentId);

    if (!result.success) {
      return res.status(409).json({ error: result.message });
    }

    return res.json({ message: result.message });
  } catch (err: any) {
    console.error("acceptOrder error:", err);
    return res.status(500).json({ error: "Failed to accept order" });
  }
}

export async function getMyOrders(req: Request, res: Response) {
  try {
    const agentId = req.user!.agentId!;
    const { status } = req.query;

    const activeStatuses = [
      "accepted",
      "purchasing",
      "bill_uploaded",
      "out_for_delivery",
    ];

    let statusFilter: any;
    if (status === "active") {
      statusFilter = { in: activeStatuses };
    } else if (status === "completed") {
      statusFilter = { in: ["delivered", "cancelled"] };
    } else if (typeof status === "string") {
      statusFilter = status;
    }

    const orders = await prisma.order.findMany({
      where: {
        agentId,
        ...(statusFilter ? { status: statusFilter } : {}),
      },
      include: {
        items: true,
        address: true,
        patient: { select: { fullName: true, mobile: true } },
        store: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return res.json({ orders });
  } catch (err: any) {
    console.error("getMyOrders error:", err);
    return res.status(500).json({ error: "Failed to fetch orders" });
  }
}

export async function updateOrderStatus(req: Request, res: Response) {
  try {
    const { orderId } = req.params;
    const { status, note } = req.body;
    const agentId = req.user!.agentId!;

    const allowedStatuses = ["purchasing", "out_for_delivery", "delivered"];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        error: `status must be one of: ${allowedStatuses.join(", ")}`,
      });
    }

    const order = await prisma.order.findUnique({ where: { id: orderId } });

    if (!order || order.agentId !== agentId) {
      return res
        .status(404)
        .json({ error: "Order not found or not assigned to you" });
    }

    const transitions: Record<string, string[]> = {
      purchasing: ["accepted"],
      out_for_delivery: ["bill_uploaded"],
      delivered: ["out_for_delivery"],
    };

    if (!transitions[status].includes(order.status)) {
      return res.status(400).json({
        error: `Cannot move order from "${order.status}" to "${status}"`,
      });
    }

    const updateData: any = { status };
    if (status === "delivered") {
      updateData.deliveredAt = new Date();
      updateData.paymentStatus = "paid";
    }

    // Replace the prisma.$transaction block in updateOrderStatus with this:
    await prisma.order.update({ where: { id: orderId }, data: updateData });

    await prisma.orderStatusHistory.create({
      data: {
        orderId,
        status,
        actorId: req.user!.id,
        actorRole: "agent",
        note: note || `Status updated to ${status} by agent`,
      },
    });

    if (status === "delivered") {
      const agent = await prisma.deliveryAgent.findUnique({
        where: { id: agentId },
      });
      if (agent) {
        await prisma.deliveryAgent.update({
          where: { id: agentId },
          data: { totalDeliveries: agent.totalDeliveries + 1 },
        });
      }

      await prisma.agentEarning.upsert({
        where: { orderId },
        update: {},
        create: {
          agentId,
          orderId,
          amount: order.deliveryCharge ?? 0,
          payoutStatus: "pending",
        },
      });
    }

    const notificationMap: Record<
      string,
      { type: any; title: string; message: string }
    > = {
      out_for_delivery: {
        type: "out_for_delivery",
        title: "Order Out for Delivery",
        message: `Your order ${order.orderNumber} is out for delivery and will reach you soon.`,
      },
      delivered: {
        type: "delivered",
        title: "Order Delivered",
        message: `Your order ${order.orderNumber} has been delivered. Please rate your delivery experience.`,
      },
    };

    if (notificationMap[status]) {
      const n = notificationMap[status];
      await notify({
        userId: order.patientId,
        type: n.type,
        title: n.title,
        message: n.message,
        orderId,
      });
    }

    return res.json({ message: `Order status updated to ${status}` });
  } catch (err: any) {
    console.error("updateOrderStatus error:", err);
    return res.status(500).json({ error: "Failed to update order status" });
  }
}

export async function uploadBill(req: Request, res: Response) {
  try {
    const { orderId } = req.params;
    const { billImageUrl, medicineCost, isUrgentConfirmed } = req.body;
    const agentId = req.user!.agentId!;

    if (!billImageUrl || medicineCost === undefined || medicineCost < 0) {
      return res
        .status(400)
        .json({ error: "billImageUrl and a valid medicineCost are required" });
    }

    const order = await prisma.order.findUnique({ where: { id: orderId } });

    if (!order || order.agentId !== agentId) {
      return res
        .status(404)
        .json({ error: "Order not found or not assigned to you" });
    }

    if (order.status !== "purchasing") {
      return res
        .status(400)
        .json({
          error: `Bill can only be uploaded when order status is "purchasing"`,
        });
    }

    const taxPercent = await getTaxPercent();
    const taxAmount = calculateTaxAmount(Number(medicineCost), taxPercent);
    const deliveryCharge = Number(order.deliveryCharge ?? 0);
    const totalAmount = Number(medicineCost) + deliveryCharge + taxAmount;

    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: orderId },
        data: {
          billImageUrl,
          medicineCost,
          taxAmount,
          totalAmount,
          status: "bill_uploaded",
        },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId,
          status: "bill_uploaded",
          actorId: req.user!.id,
          actorRole: "agent",
          note: "Agent uploaded purchase bill and entered medicine cost",
        },
      });
    });

    const invoiceResult = await generateInvoice(orderId);

    await notify({
      userId: order.patientId,
      type: "bill_generated",
      title: "Invoice Generated",
      message: `Your invoice for order ${order.orderNumber} is ready. Total payable on delivery: ₹${totalAmount.toFixed(2)}`,
      orderId,
    });

    return res.json({
      message: "Bill uploaded and invoice generated",
      invoiceId: invoiceResult.invoiceId,
      pdfUrl: invoiceResult.pdfUrl,
      totalAmount,
    });
  } catch (err: any) {
    console.error("uploadBill error:", err);
    return res.status(500).json({ error: "Failed to upload bill" });
  }
}

export async function getEarnings(req: Request, res: Response) {
  try {
    const agentId = req.user!.agentId!;

    const earnings = await prisma.agentEarning.findMany({
      where: { agentId },
      include: { order: { select: { orderNumber: true, deliveredAt: true } } },
      orderBy: { createdAt: "desc" },
    });

    const totalEarned = earnings.reduce((sum, e) => sum + Number(e.amount), 0);
    const totalPending = earnings
      .filter((e) => e.payoutStatus === "pending")
      .reduce((sum, e) => sum + Number(e.amount), 0);
    const totalPaid = earnings
      .filter((e) => e.payoutStatus === "paid")
      .reduce((sum, e) => sum + Number(e.amount), 0);

    return res.json({
      earnings,
      summary: { totalEarned, totalPending, totalPaid },
    });
  } catch (err: any) {
    console.error("getEarnings error:", err);
    return res.status(500).json({ error: "Failed to fetch earnings" });
  }
}

export async function getAgentProfile(req: Request, res: Response) {
  try {
    const agent = await prisma.deliveryAgent.findUnique({
      where: { userId: req.user!.id },
      include: { user: true },
    });

    if (!agent) {
      return res.status(404).json({ error: "Agent profile not found" });
    }

    return res.json({ agent });
  } catch (err: any) {
    console.error("getAgentProfile error:", err);
    return res.status(500).json({ error: "Failed to fetch agent profile" });
  }
}
