import { Router } from "express";
import { sendOtp, verifyOtp } from "../controllers/otp.controller";
import {
  registerPatient,
  registerAgent,
  getMe,
  updateLanguage,
} from "../controllers/auth.controller";
import { authenticate } from "../middleware/auth";
import multer from "multer";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

const router = Router();

router.post("/register/patient", registerPatient);
router.post(
  "/register/agent",
  upload.fields([
    { name: "aadhaarFile", maxCount: 1 },
    { name: "profileFile", maxCount: 1 },
  ]),
  registerAgent,
);
router.get("/me", authenticate, getMe);
router.patch("/language", authenticate, updateLanguage);
router.post("/send-otp", sendOtp);
router.post("/verify-otp", verifyOtp);

export default router;
