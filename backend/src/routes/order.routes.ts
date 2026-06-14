import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { roleGuard } from "../middleware/roleGuard";
import {
  createOrder,
  getOrder,
  listMyOrders,
  cancelOrder,
  rateOrder,
} from "../controllers/order.controller";

const router = Router();

router.use(authenticate);

router.post("/", roleGuard("patient"), createOrder);
router.get("/", roleGuard("patient"), listMyOrders);
router.get("/:id", getOrder);
router.post("/:id/cancel", roleGuard("patient"), cancelOrder);
router.post("/:id/rate", roleGuard("patient"), rateOrder);

export default router;
