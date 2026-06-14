import { prisma } from "../utils/prisma";
import { Prisma } from "@prisma/client";

export interface DeliveryChargeBreakdown {
  baseCharge: number;
  distanceCharge: number;
  platformCharge: number;
  urgentCharge: number;
  totalDeliveryCharge: number;
}

interface ChargeRow {
  base_charge: Prisma.Decimal;
  distance_charge: Prisma.Decimal;
  platform_charge: Prisma.Decimal;
  urgent_charge: Prisma.Decimal;
  total_delivery_charge: Prisma.Decimal;
}

export async function calculateDeliveryCharge(
  distanceKm: number,
  isUrgent: boolean,
): Promise<DeliveryChargeBreakdown> {
  const rows = await prisma.$queryRaw<ChargeRow[]>`
    SELECT * FROM calculate_delivery_charge(${distanceKm}::numeric, ${isUrgent}::boolean)
  `;

  if (!rows || rows.length === 0) {
    return {
      baseCharge: 10,
      distanceCharge: 20,
      platformCharge: 2,
      urgentCharge: isUrgent ? 25 : 0,
      totalDeliveryCharge: isUrgent ? 57 : 32,
    };
  }

  const row = rows[0];

  return {
    baseCharge: Number(row.base_charge),
    distanceCharge: Number(row.distance_charge),
    platformCharge: Number(row.platform_charge),
    urgentCharge: Number(row.urgent_charge),
    totalDeliveryCharge: Number(row.total_delivery_charge),
  };
}

export async function getTaxPercent(): Promise<number> {
  const setting = await prisma.appSetting.findUnique({
    where: { key: "tax_percent" },
  });
  return setting ? Number(setting.value) : 0;
}

export function calculateTaxAmount(
  medicineCost: number,
  taxPercent: number,
): number {
  return Math.round(((medicineCost * taxPercent) / 100) * 100) / 100;
}
