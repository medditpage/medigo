// auth.controllers.ts
import { Request, Response } from "express";
import { prisma } from "../utils/prisma";
import { supabaseAdmin } from "../utils/supabase";
import { notify } from "../services/notification.service";

export async function registerPatient(req: Request, res: Response) {
  try {
    const {
      fullName,
      mobile,
      email,
      password,
      addressLine,
      city,
      state,
      pincode,
      latitude,
      longitude,
      language,
    } = req.body;

    if (
      !fullName ||
      !mobile ||
      !email ||
      !password ||
      !addressLine ||
      !city ||
      !state ||
      !pincode
    ) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // ✅ CHECK: Mobile must be OTP verified before registration
    const otpRecord = await prisma.otpVerification.findFirst({
      where: { mobile, purpose: "registration", verified: true },
      orderBy: { createdAt: "desc" },
    });
    if (!otpRecord) {
      return res.status(403).json({
        error: "Mobile number not verified. Please verify OTP first",
      });
    }

    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { mobile }] },
    });
    if (existing) {
      return res
        .status(409)
        .json({ error: "A user with this email or mobile already exists" });
    }

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        role: "patient",
        full_name: fullName,
        mobile,
        language: language || "en",
      },
    });

    if (error || !data?.user) {
      return res
        .status(400)
        .json({ error: error?.message || "Failed to create account" });
    }

    await prisma.user.upsert({
      where: { id: data.user.id },
      update: {},
      create: {
        id: data.user.id,
        role: "patient",
        fullName,
        mobile,
        email,
        language: language || "en",
        mobileVerified: true, // ✅ Mark mobile as verified
      },
    });

    await prisma.address.create({
      data: {
        userId: data.user.id,
        label: "home",
        addressLine,
        city,
        state,
        pincode,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        isDefault: true,
      },
    });

    notify({
      userId: data.user.id,
      type: "registration",
      title: "Welcome to Medzink",
      message: `Hi ${fullName}, your Medzink account has been created successfully.`,
    }).catch(console.error);

    return res.status(201).json({
      message: "Patient registered successfully",
      userId: data.user.id,
    });
  } catch (err: any) {
    console.error("registerPatient error:", err);
    return res.status(500).json({ error: "Failed to register patient" });
  }
}

export async function registerAgent(req: Request, res: Response) {
  try {
    const files = req.files as Record<string, Express.Multer.File[]>;
    const aadhaarFile = files?.["aadhaarFile"]?.[0];
    const profileFile = files?.["profileFile"]?.[0];

    const {
      fullName,
      mobile,
      email,
      password,
      addressLine,
      city,
      state,
      pincode,
      latitude,
      longitude,
      aadhaarNumber,
      vehicleType,
      vehicleNumber,
      language,
    } = req.body;

    if (
      !fullName ||
      !mobile ||
      !email ||
      !password ||
      !addressLine ||
      !city ||
      !state ||
      !pincode ||
      !aadhaarNumber ||
      !vehicleType ||
      !vehicleNumber
    ) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    if (!aadhaarFile) {
      return res.status(400).json({ error: "Aadhaar image is required" });
    }

    // ✅ CHECK: Mobile must be OTP verified before registration
    const otpRecord = await prisma.otpVerification.findFirst({
      where: { mobile, purpose: "registration", verified: true },
      orderBy: { createdAt: "desc" },
    });
    if (!otpRecord) {
      return res.status(403).json({
        error: "Mobile number not verified. Please verify OTP first",
      });
    }

    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ email }, { mobile }] },
    });
    if (existingUser) {
      return res
        .status(409)
        .json({ error: "A user with this email or mobile already exists" });
    }

    const existingAgent = await prisma.deliveryAgent.findUnique({
      where: { aadhaarNumber },
    });
    if (existingAgent) {
      return res.status(409).json({
        error: "An agent with this Aadhaar number is already registered",
      });
    }

    const folder = mobile;
    const aadhaarPath = `${folder}/aadhaar-${Date.now()}`;
    const { error: aadhaarUploadError } = await supabaseAdmin.storage
      .from("agent-docs")
      .upload(aadhaarPath, aadhaarFile.buffer, {
        contentType: aadhaarFile.mimetype,
        upsert: true,
      });

    if (aadhaarUploadError) {
      return res.status(500).json({ error: "Failed to upload Aadhaar image" });
    }

    const { data: aadhaarUrlData } = await supabaseAdmin.storage
      .from("agent-docs")
      .createSignedUrl(aadhaarPath, 60 * 60 * 24 * 365);

    const aadhaarImageUrl = aadhaarUrlData?.signedUrl || aadhaarPath;

    let profilePhotoUrl: string | null = null;
    if (profileFile) {
      const profilePath = `${folder}/profile-${Date.now()}`;
      await supabaseAdmin.storage
        .from("agent-docs")
        .upload(profilePath, profileFile.buffer, {
          contentType: profileFile.mimetype,
          upsert: true,
        });

      const { data: profileUrlData } = await supabaseAdmin.storage
        .from("agent-docs")
        .createSignedUrl(profilePath, 60 * 60 * 24 * 365);

      profilePhotoUrl = profileUrlData?.signedUrl || null;
    }

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        role: "agent",
        full_name: fullName,
        mobile,
        language: language || "en",
      },
    });

    if (error || !data?.user) {
      console.error("Supabase createUser error:", JSON.stringify(error));
      return res
        .status(400)
        .json({ error: error?.message || "Failed to create account" });
    }

    await prisma.user.upsert({
      where: { id: data.user.id },
      update: {},
      create: {
        id: data.user.id,
        role: "agent",
        fullName,
        mobile,
        email,
        language: language || "en",
        mobileVerified: true, // ✅ Mark mobile as verified
      },
    });

    await prisma.address.create({
      data: {
        userId: data.user.id,
        label: "home",
        addressLine,
        city,
        state,
        pincode,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        isDefault: true,
      },
    });

    await prisma.deliveryAgent.create({
      data: {
        userId: data.user.id,
        aadhaarNumber,
        aadhaarImageUrl,
        profilePhotoUrl,
        vehicleType,
        vehicleNumber,
        status: "pending",
        currentLatitude: latitude ? parseFloat(latitude) : null,
        currentLongitude: longitude ? parseFloat(longitude) : null,
      },
    });

    notify({
      userId: data.user.id,
      type: "registration",
      title: "Agent Registration Received",
      message: `Hi ${fullName}, your delivery agent application has been received and is pending admin approval.`,
    }).catch(console.error);

    return res.status(201).json({
      message: "Agent registration submitted. Awaiting admin approval.",
      userId: data.user.id,
    });
  } catch (err: any) {
    console.error("registerAgent error:", err);
    return res.status(500).json({ error: "Failed to register agent" });
  }
}

export async function getMe(req: Request, res: Response) {
  try {
    const userId = req.user!.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        addresses: true,
        deliveryAgent: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.json({ user });
  } catch (err: any) {
    console.error("getMe error:", err);
    return res.status(500).json({ error: "Failed to fetch profile" });
  }
}

export async function updateLanguage(req: Request, res: Response) {
  try {
    const { language } = req.body;

    if (!["en", "hi"].includes(language)) {
      return res
        .status(400)
        .json({ error: 'Invalid language. Must be "en" or "hi"' });
    }

    await prisma.user.update({
      where: { id: req.user!.id },
      data: { language },
    });

    return res.json({ message: "Language updated", language });
  } catch (err: any) {
    console.error("updateLanguage error:", err);
    return res.status(500).json({ error: "Failed to update language" });
  }
}
