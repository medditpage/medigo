// patient.routes.ts
import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { roleGuard } from "../middleware/roleGuard";
import {
  getProfile,
  updateProfile,
  listAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  listFamilyMembers,
  createFamilyMember,
  updateFamilyMember,
  deleteFamilyMember,
  getNearbyStores,
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  createComplaint,
  listMyComplaints,
} from "../controllers/patient.controller";

const router = Router();

router.use(authenticate);
router.use(roleGuard("patient"));

router.get("/profile", getProfile);
router.patch("/profile", updateProfile);

router.get("/addresses", listAddresses);
router.post("/addresses", createAddress);
router.patch("/addresses/:id", updateAddress);
router.delete("/addresses/:id", deleteAddress);

router.get("/family-members", listFamilyMembers);
router.post("/family-members", createFamilyMember);
router.patch("/family-members/:id", updateFamilyMember);
router.delete("/family-members/:id", deleteFamilyMember);

router.get("/stores/nearby", getNearbyStores);

router.get("/notifications", listNotifications);
router.patch("/notifications/:id/read", markNotificationRead);
router.patch("/notifications/read-all", markAllNotificationsRead);

router.post("/complaints", createComplaint);
router.get("/complaints", listMyComplaints);

export default router;
