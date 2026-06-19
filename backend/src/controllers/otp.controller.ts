import { Request, Response } from "express";
import { prisma } from "../utils/prisma";
import { sendMail, wrapEmailTemplate } from "../utils/mailer";

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function sendOtp(req: Request, res: Response) {
  try {
    // Frontend se ab hum 'email' receive karenge (mobile ki jagah)
    const { email, purpose = "registration" } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email address is required" });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Invalid email address" });
    }

    if (purpose === "registration") {
      const existing = await prisma.user.findUnique({
        where: { email },
        select: { id: true }, // <--- emailVerified ko hatakar id kar diya
      });
      if (existing) {
        return res
          .status(409)
          .json({ error: "Email address already registered" });
      }
    }

    // Purane OTPs invalidate karo
    await prisma.otpVerification.updateMany({
      where: { email, purpose, verified: false },
      data: { verified: true },
    });

    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    const otpRecord = await prisma.otpVerification.create({
      data: { email, otp, purpose, expiresAt },
    });

    try {
      // Tumhara custom email template use karke mail bhejna
      const title = "Your OTP Verification Code";
      const bodyHtml = `
        <p>Hello,</p>
        <p>Your verification code for Medzink is: <br/><br/>
        <strong style="font-size: 28px; color: #0ea5e9; letter-spacing: 4px;">${otp}</strong></p>
        <p>This code is valid for 10 minutes. Please do not share it with anyone.</p>
      `;

      const finalHtml = wrapEmailTemplate(title, bodyHtml);

      const mailResult = await sendMail({
        to: email,
        subject: "Medzink - Verification OTP",
        html: finalHtml,
      });

      if (!mailResult.success) {
        throw new Error(mailResult.error);
      }
    } catch (emailErr: any) {
      await prisma.otpVerification.delete({ where: { id: otpRecord.id } });
      console.error("sendMail error:", emailErr);
      return res.status(500).json({ error: "Failed to send OTP to email." });
    }

    return res.json({ message: "OTP sent successfully to your email" });
  } catch (err: any) {
    console.error("sendOtp error:", err);
    return res.status(500).json({ error: "Failed to send OTP" });
  }
}

export async function verifyOtp(req: Request, res: Response) {
  try {
    const { email, otp, purpose = "registration" } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ error: "Email and OTP are required" });
    }

    const record = await prisma.otpVerification.findFirst({
      where: { email, purpose, verified: false },
      orderBy: { createdAt: "desc" },
    });

    if (!record) {
      return res
        .status(400)
        .json({ error: "No active OTP found for this email" });
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
      message: "Email verified successfully",
      verified: true,
    });
  } catch (err: any) {
    console.error("verifyOtp error:", err);
    return res.status(500).json({ error: "Failed to verify OTP" });
  }
}
