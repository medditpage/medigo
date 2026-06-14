import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { roleGuard, approvedAgentOnly } from "../middleware/roleGuard";
import {
  toggleOnline,
  updateLocation,
  getIncomingOrders,
  acceptOrder,
  getMyOrders,
  updateOrderStatus,
  uploadBill,
  getEarnings,
  getAgentProfile,
} from "../controllers/agent.controller";
import { upload } from "../middleware/upload";
import { uploadBillFile } from "../controllers/agent.controller";
const router = Router();

router.use(authenticate, roleGuard("agent"));

// Profile & status (available even if pending approval)
router.get("/profile", getAgentProfile);
router.patch("/online", approvedAgentOnly, toggleOnline);
router.patch("/location", approvedAgentOnly, updateLocation);

// Order management (approved agents only)
router.get("/orders/incoming", approvedAgentOnly, getIncomingOrders);
router.post("/orders/:orderId/accept", approvedAgentOnly, acceptOrder);
router.get("/orders", approvedAgentOnly, getMyOrders);
router.patch("/orders/:orderId/status", approvedAgentOnly, updateOrderStatus);
router.post("/orders/:orderId/bill", approvedAgentOnly, uploadBill);
router.post(
  "/orders/:orderId/upload-bill",
  approvedAgentOnly,
  upload.single("file"),
  uploadBillFile,
);
// Earnings
router.get("/earnings", approvedAgentOnly, getEarnings);

export default router;
