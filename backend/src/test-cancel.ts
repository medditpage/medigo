import dotenv from "dotenv";
dotenv.config();

import { prisma } from "./utils/prisma";

async function main() {
  const orderId = "17e9ea6f-a6e1-4593-ac99-aa15ae266c37";

  console.log("Testing simple update...");
  const result = await prisma.order.update({
    where: { id: orderId },
    data: { status: "cancelled" },
  });

  console.log("SUCCESS:", result.id, result.status);
}

main()
  .catch((e) => console.error("ERROR:", e))
  .finally(() => prisma.$disconnect());
