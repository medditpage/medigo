// admin.route.ts
import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { roleGuard } from "../middleware/roleGuard";
import {
  getDashboard,
  listUsers,
  toggleBanUser,
  listAgents,
  approveAgent,
  rejectAgent,
  banAgent,
  listStores,
  createStore,
  updateStore,
  deleteStore,
  listAllOrders,
  listComplaints,
  updateComplaint,
  getRevenueAnalytics,
  listChargeRules,
  createChargeRule,
  updateChargeRule,
  updateAppSetting,
  listAuditLogs,
} from "../controllers/admin.controller";
import {
  listAgentEarnings,
  markEarningPaid,
} from "../controllers/admin.controller";



const router = Router();

router.use(authenticate);
router.use(roleGuard("admin"));

router.get("/dashboard", getDashboard);

router.get("/users", listUsers);
router.patch("/users/:id/ban", toggleBanUser);

router.get("/agents", listAgents);
router.patch("/agents/:id/approve", approveAgent);
router.patch("/agents/:id/reject", rejectAgent);
router.patch("/agents/:id/ban", banAgent);

router.get("/stores", listStores);
router.post("/stores", createStore);
router.patch("/stores/:id", updateStore);
router.delete("/stores/:id", deleteStore);

router.get("/orders", listAllOrders);

router.get("/earnings", listAgentEarnings);
router.patch("/earnings/:id/pay", markEarningPaid);

// Manual agent assignment (admin override)
router.post("/orders/:orderId/assign", async (req, res) => {
  const { prisma } = await import("../utils/prisma");
  const { notify } = await import("../services/notification.service");
  const { broadcastOrderToAgents } =
    await import("../services/assignment.service");
  const { orderId } = req.params;
  const { agentId } = req.body;

  if (!agentId) {
    return res.status(400).json({ error: "agentId is required" });
  }

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return res.status(404).json({ error: "Order not found" });
  if (!["pending", "assigned"].includes(order.status)) {
    return res
      .status(400)
      .json({ error: `Cannot assign order with status "${order.status}"` });
  }

  const agent = await prisma.deliveryAgent.findUnique({
    where: { id: agentId },
    include: { user: true },
  });
  if (!agent || agent.status !== "approved") {
    return res.status(404).json({ error: "Approved agent not found" });
  }

  const expiresAt = new Date(Date.now() + 90 * 1000);

  await prisma.$transaction(async (tx) => {
    await tx.orderAssignment.upsert({
      where: { orderId_agentId: { orderId, agentId } },
      update: {
        status: "broadcast",
        broadcastAt: new Date(),
        expiresAt,
        respondedAt: null,
      },
      create: { orderId, agentId, status: "broadcast", expiresAt },
    });
    await tx.order.update({
      where: { id: orderId },
      data: { status: "assigned" },
    });
  });

  await notify({
    userId: agent.userId,
    type: "order_placed",
    title: "New Delivery Request",
    message: `Order ${order.orderNumber} has been manually assigned to you by admin.`,
    orderId,
    sendEmail: true,
  });

  return res.json({ message: `Order assigned to ${agent.user.fullName}` });
});

router.post("/orders/:orderId/rebroadcast", async (req, res) => {
  const { broadcastOrderToAgents } =
    await import("../services/assignment.service");
  const { orderId } = req.params;

  try {
    const result = await broadcastOrderToAgents(orderId);
    return res.json({
      message: `Re-broadcast to ${result.broadcastCount} agent(s)`,
      agentsNotified: result.broadcastCount,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get("/complaints", listComplaints);
router.patch("/complaints/:id", updateComplaint);

router.get("/revenue", getRevenueAnalytics);

router.get("/charge-rules", listChargeRules);
router.post("/charge-rules", createChargeRule);
router.patch("/charge-rules/:id", updateChargeRule);
router.patch("/settings/:key", updateAppSetting);

router.get("/audit-logs", listAuditLogs);

export default router;
