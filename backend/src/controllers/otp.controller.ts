import { Request, Response } from "express";
import { prisma } from "../utils/prisma";

// ─── SMS sender ───────────────────────────────────────────────────────────────
async function sendSms(mobile: string, otp: string): Promise<void> {
  if (!process.env.FAST2SMS_API_KEY) {
    console.log(`📱 OTP for ${mobile}: ${otp}`);
    return;
  }

  const response = await fetch("https://www.fast2sms.com/dev/bulkV2", {
    method: "POST",
    headers: {
      authorization: process.env.FAST2SMS_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      route: "otp", // 'q' hata kar 'otp' likho
      variables_values: otp, // Custom message hata kar sirf variables_values use karo
      numbers: mobile,
    }),
  });

  const raw = await response.text();
  console.log("Fast2SMS raw response:", raw);
  const result = JSON.parse(raw) as { return: boolean; message?: string[] };
  if (!result.return) {
    throw new Error(result.message?.[0] || "Failed to send SMS");
  }
}
// ─────────────────────────────────────────────────────────────────────────────

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function sendOtp(req: Request, res: Response) {
  try {
    const { mobile, purpose = "registration" } = req.body;

    if (!mobile) {
      return res.status(400).json({ error: "Mobile number is required" });
    }

    const mobileRegex = /^[6-9]\d{9}$/;
    if (!mobileRegex.test(mobile)) {
      return res.status(400).json({ error: "Invalid Indian mobile number" });
    }

    if (purpose === "registration") {
      const existing = await prisma.user.findUnique({
        where: { mobile },
        select: { mobileVerified: true },
      });
      if (existing) {
        return res.status(409).json({
          error: "Mobile number already registered",
        });
      }
    }

    await prisma.otpVerification.updateMany({
      where: { mobile, purpose, verified: false },
      data: { verified: true },
    });

    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    const otpRecord = await prisma.otpVerification.create({
      data: { mobile, otp, purpose, expiresAt },
    });

    try {
      await sendSms(mobile, otp);
    } catch (smsErr: any) {
      await prisma.otpVerification.delete({ where: { id: otpRecord.id } });
      console.error("sendSms error:", smsErr);
      return res
        .status(500)
        .json({ error: "Failed to send OTP. Please try again" });
    }

    return res.json({ message: "OTP sent successfully" });
  } catch (err: any) {
    console.error("sendOtp error:", err);
    return res.status(500).json({ error: "Failed to send OTP" });
  }
}

export async function verifyOtp(req: Request, res: Response) {
  try {
    const { mobile, otp, purpose = "registration" } = req.body;

    if (!mobile || !otp) {
      return res.status(400).json({ error: "Mobile and OTP are required" });
    }

    const record = await prisma.otpVerification.findFirst({
      where: { mobile, purpose, verified: false },
      orderBy: { createdAt: "desc" },
    });

    if (!record) {
      return res
        .status(400)
        .json({ error: "No active OTP found for this number" });
    }

    if (new Date() > record.expiresAt) {
      return res
        .status(400)
        .json({ error: "OTP has expired. Please request a new one" });
    }

    if (record.otp !== otp) {
      return res.status(400).json({ error: "Invalid OTP" });
    }

    await prisma.otpVerification.update({
      where: { id: record.id },
      data: { verified: true },
    });

    return res.json({
      message: "Mobile verified successfully",
      verified: true,
    });
  } catch (err: any) {
    console.error("verifyOtp error:", err);
    return res.status(500).json({ error: "Failed to verify OTP" });
  }
}
