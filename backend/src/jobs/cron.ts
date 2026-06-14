import cron from "node-cron";
import { expireStaleAssignments } from "../services/assignment.service";
import { prisma } from "../utils/prisma";

let isExpiringAssignments = false;
let isUpdatingMetrics = false;

export function startCronJobs() {
  cron.schedule("*/30 * * * * *", async () => {
    if (isExpiringAssignments) {
      console.log(
        "[cron] expireStaleAssignments already running, skipping this tick",
      );
      return;
    }

    isExpiringAssignments = true;
    try {
      const expiredCount = await expireStaleAssignments();
      if (expiredCount > 0) {
        console.log(`[cron] Expired ${expiredCount} stale order assignments`);
      }
    } catch (err: any) {
      console.error("[cron] expireStaleAssignments error:", err.message);
    } finally {
      isExpiringAssignments = false;
    }
  });

  cron.schedule("5 0 * * *", async () => {
    if (isUpdatingMetrics) {
      console.log(
        "[cron] update_daily_metrics already running, skipping this tick",
      );
      return;
    }

    isUpdatingMetrics = true;
    try {
      await prisma.$queryRaw`SELECT update_daily_metrics()`;
      console.log("[cron] Daily metrics updated");
    } catch (err: any) {
      console.error("[cron] update_daily_metrics error:", err.message);
    } finally {
      isUpdatingMetrics = false;
    }
  });

  console.log("[cron] Scheduled jobs started");
}
