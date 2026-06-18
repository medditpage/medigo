//patient.controller
import { Request, Response } from "express";
import { prisma } from "../utils/prisma";

interface NearestStoreRow {
  id: string;
  name: string;
  phone: string;
  address_line: string;
  city: string;
  state: string;
  pincode: string;
  latitude: number;
  longitude: number;
  distance_km: number;
  opens_at: string | null;
  closes_at: string | null;
}

export async function getProfile(req: Request, res: Response) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: { addresses: true, familyMembers: true },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.json({ user });
  } catch (err: any) {
    console.error("getProfile error:", err);
    return res.status(500).json({ error: "Failed to fetch profile" });
  }
}

export async function updateProfile(req: Request, res: Response) {
  try {
    const { fullName, mobile } = req.body;

    const updated = await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        ...(fullName ? { fullName } : {}),
        ...(mobile ? { mobile } : {}),
      },
    });

    return res.json({ message: "Profile updated", user: updated });
  } catch (err: any) {
    console.error("updateProfile error:", err);
    return res.status(500).json({ error: "Failed to update profile" });
  }
}

export async function listAddresses(req: Request, res: Response) {
  try {
    const addresses = await prisma.address.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: "desc" },
    });
    return res.json({ addresses });
  } catch (err: any) {
    console.error("listAddresses error:", err);
    return res.status(500).json({ error: "Failed to fetch addresses" });
  }
}

export async function createAddress(req: Request, res: Response) {
  try {
    const {
      label,
      addressLine,
      city,
      state,
      pincode,
      latitude,
      longitude,
      isDefault,
    } = req.body;

    console.log("createAddress payload:", JSON.stringify(req.body));

    if (!addressLine || !city || !state || !pincode) {
      return res.status(400).json({ error: "Missing required address fields" });
    }

    if (isDefault) {
      await prisma.address.updateMany({
        where: { userId: req.user!.id },
        data: { isDefault: false },
      });
    }

    const address = await prisma.address.create({
      data: {
        userId: req.user!.id,
        label: label || "other",
        addressLine,
        city,
        state,
        pincode,
        latitude: latitude ?? null,
        longitude: longitude ?? null,
        isDefault: !!isDefault,
      },
    });

    return res.status(201).json({ address });
  } catch (err: any) {
    console.error("createAddress error:", err);
    return res.status(500).json({ error: "Failed to create address" });
  }
}

export async function updateAddress(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const {
      label,
      addressLine,
      city,
      state,
      pincode,
      latitude,
      longitude,
      isDefault,
    } = req.body;

    const existing = await prisma.address.findUnique({ where: { id } });
    if (!existing || existing.userId !== req.user!.id) {
      return res.status(404).json({ error: "Address not found" });
    }

    if (isDefault) {
      await prisma.address.updateMany({
        where: { userId: req.user!.id },
        data: { isDefault: false },
      });
    }

    const address = await prisma.address.update({
      where: { id },
      data: {
        ...(label !== undefined ? { label } : {}),
        ...(addressLine !== undefined ? { addressLine } : {}),
        ...(city !== undefined ? { city } : {}),
        ...(state !== undefined ? { state } : {}),
        ...(pincode !== undefined ? { pincode } : {}),
        ...(latitude !== undefined ? { latitude } : {}),
        ...(longitude !== undefined ? { longitude } : {}),
        ...(isDefault !== undefined ? { isDefault } : {}),
      },
    });

    return res.json({ address });
  } catch (err: any) {
    console.error("updateAddress error:", err);
    return res.status(500).json({ error: "Failed to update address" });
  }
}

export async function deleteAddress(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const existing = await prisma.address.findUnique({ where: { id } });
    if (!existing || existing.userId !== req.user!.id) {
      return res.status(404).json({ error: "Address not found" });
    }

    await prisma.address.delete({ where: { id } });
    return res.json({ message: "Address deleted" });
  } catch (err: any) {
    console.error("deleteAddress error:", err);
    return res.status(500).json({ error: "Failed to delete address" });
  }
}

export async function listFamilyMembers(req: Request, res: Response) {
  try {
    const familyMembers = await prisma.familyMember.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: "desc" },
    });
    return res.json({ familyMembers });
  } catch (err: any) {
    console.error("listFamilyMembers error:", err);
    return res.status(500).json({ error: "Failed to fetch family members" });
  }
}

export async function createFamilyMember(req: Request, res: Response) {
  try {
    const { fullName, relation, age, mobile } = req.body;

    if (!fullName || !relation) {
      return res
        .status(400)
        .json({ error: "fullName and relation are required" });
    }

    const validRelations = [
      "father",
      "mother",
      "child",
      "grandparent",
      "spouse",
      "sibling",
      "other",
    ];
    if (!validRelations.includes(relation)) {
      return res.status(400).json({ error: "Invalid relation value" });
    }

    const familyMember = await prisma.familyMember.create({
      data: {
        userId: req.user!.id,
        fullName,
        relation,
        age: age ?? null,
        mobile: mobile ?? null,
      },
    });

    return res.status(201).json({ familyMember });
  } catch (err: any) {
    console.error("createFamilyMember error:", err);
    return res.status(500).json({ error: "Failed to add family member" });
  }
}

export async function updateFamilyMember(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { fullName, relation, age, mobile } = req.body;

    const existing = await prisma.familyMember.findUnique({ where: { id } });
    if (!existing || existing.userId !== req.user!.id) {
      return res.status(404).json({ error: "Family member not found" });
    }

    const familyMember = await prisma.familyMember.update({
      where: { id },
      data: {
        ...(fullName !== undefined ? { fullName } : {}),
        ...(relation !== undefined ? { relation } : {}),
        ...(age !== undefined ? { age } : {}),
        ...(mobile !== undefined ? { mobile } : {}),
      },
    });

    return res.json({ familyMember });
  } catch (err: any) {
    console.error("updateFamilyMember error:", err);
    return res.status(500).json({ error: "Failed to update family member" });
  }
}

export async function deleteFamilyMember(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const existing = await prisma.familyMember.findUnique({ where: { id } });
    if (!existing || existing.userId !== req.user!.id) {
      return res.status(404).json({ error: "Family member not found" });
    }

    await prisma.familyMember.delete({ where: { id } });
    return res.json({ message: "Family member removed" });
  } catch (err: any) {
    console.error("deleteFamilyMember error:", err);
    return res.status(500).json({ error: "Failed to delete family member" });
  }
}

export async function getNearbyStores(req: Request, res: Response) {
  try {
    const lat = parseFloat(req.query.lat as string);
    const lng = parseFloat(req.query.lng as string);
    const radius = req.query.radius
      ? parseFloat(req.query.radius as string)
      : 10;

    if (isNaN(lat) || isNaN(lng)) {
      return res
        .status(400)
        .json({ error: "lat and lng query parameters are required" });
    }

    const stores = await prisma.$queryRaw<NearestStoreRow[]>`
      SELECT * FROM get_nearest_stores(${lat}::double precision, ${lng}::double precision, ${radius}::double precision)
    `;

    return res.json({ stores });
  } catch (err: any) {
    console.error("getNearbyStores error:", err);
    return res.status(500).json({ error: "Failed to fetch nearby stores" });
  }
}

export async function listNotifications(req: Request, res: Response) {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    const unreadCount = await prisma.notification.count({
      where: { userId: req.user!.id, isRead: false },
    });

    return res.json({ notifications, unreadCount });
  } catch (err: any) {
    console.error("listNotifications error:", err);
    return res.status(500).json({ error: "Failed to fetch notifications" });
  }
}

export async function markNotificationRead(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const existing = await prisma.notification.findUnique({ where: { id } });
    if (!existing || existing.userId !== req.user!.id) {
      return res.status(404).json({ error: "Notification not found" });
    }

    await prisma.notification.update({ where: { id }, data: { isRead: true } });
    return res.json({ message: "Notification marked as read" });
  } catch (err: any) {
    console.error("markNotificationRead error:", err);
    return res.status(500).json({ error: "Failed to update notification" });
  }
}

export async function markAllNotificationsRead(req: Request, res: Response) {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user!.id, isRead: false },
      data: { isRead: true },
    });
    return res.json({ message: "All notifications marked as read" });
  } catch (err: any) {
    console.error("markAllNotificationsRead error:", err);
    return res.status(500).json({ error: "Failed to update notifications" });
  }
}

export async function createComplaint(req: Request, res: Response) {
  try {
    const { orderId, category, subject, description } = req.body;

    const validCategories = [
      "wrong_medicine",
      "missing_medicine",
      "damaged_product",
      "late_delivery",
      "overcharging",
      "other",
    ];

    if (
      !category ||
      !validCategories.includes(category) ||
      !subject ||
      !description
    ) {
      return res
        .status(400)
        .json({ error: "category, subject and description are required" });
    }

    if (orderId) {
      const order = await prisma.order.findUnique({ where: { id: orderId } });
      if (!order || order.patientId !== req.user!.id) {
        return res.status(404).json({ error: "Order not found" });
      }
    }

    const ticketNumber = `TKT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const complaint = await prisma.complaint.create({
      data: {
        ticketNumber,
        orderId: orderId ?? null,
        userId: req.user!.id,
        category,
        subject,
        description,
        status: "open",
      },
    });

    return res.status(201).json({ complaint });
  } catch (err: any) {
    console.error("createComplaint error:", err);
    return res.status(500).json({ error: "Failed to create complaint" });
  }
}

export async function listMyComplaints(req: Request, res: Response) {
  try {
    const complaints = await prisma.complaint.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: "desc" },
      include: { order: { select: { orderNumber: true } } },
    });

    return res.json({ complaints });
  } catch (err: any) {
    console.error("listMyComplaints error:", err);
    return res.status(500).json({ error: "Failed to fetch complaints" });
  }
}
