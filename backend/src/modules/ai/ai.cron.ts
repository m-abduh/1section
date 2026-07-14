import cron, { ScheduledTask } from "node-cron";
import { prisma } from "../../lib/prisma";
import { getRedis } from "../../lib/redis";
import { AiService } from "./ai.service";

const CRON_LOCK_KEY = "cron:ai-generator:lock";
const LOCK_TTL = 60; // 60 seconds lock TTL

let currentJob: ScheduledTask | null = null;

async function executeJob() {
  console.log("[AI Cron] Auto-generating module...");

  const redis = getRedis();
  if (redis) {
    // Try to acquire distributed lock — only one instance executes
    const lockAcquired = await redis.set(CRON_LOCK_KEY, "1", "EX", LOCK_TTL, "NX").catch(() => null);
    if (!lockAcquired) {
      console.log("[AI Cron] Another instance is executing, skipping");
      return;
    }
  }

  try {
    const config = await prisma.cronJob.findUnique({
      where: { key: "ai-generator" },
      include: { category: { select: { name: true } } },
    });
    const catName = config?.category?.name || undefined;
    const module = await AiService.autoGenerate(catName);
    console.log(`[AI Cron] Module created: ${module.slug}`);
  } catch (err) {
    console.error("[AI Cron] Error:", err);
  } finally {
    if (redis) {
      // Release lock
      await redis.del(CRON_LOCK_KEY).catch(() => {});
    }
  }
}

export namespace AiCron {
  export async function getSchedule() {
    const config = await prisma.cronJob.findUnique({
      where: { key: "ai-generator" },
      include: { category: { select: { name: true } } },
    });
    if (!config || !config.active || !currentJob) return null;
    return {
      expression: config.expression,
      category: config.category?.name || null,
      createdAt: config.createdAt.toISOString(),
      isActive: config.active,
    };
  }

  export async function start(expression: string, categoryName?: string) {
    stop();

    if (!cron.validate(expression)) {
      throw new Error(`Invalid cron expression: ${expression}`);
    }

    let categoryId: string | null = null;
    if (categoryName) {
      const cat = await prisma.category.findUnique({ where: { name: categoryName }, select: { id: true } });
      categoryId = cat?.id || null;
    }

    await prisma.cronJob.upsert({
      where: { key: "ai-generator" },
      update: { expression, categoryId, active: true },
      create: { key: "ai-generator", expression, categoryId, active: true },
    });

    currentJob = cron.schedule(expression, () => {
      executeJob();
    });

    console.log(`[AI Cron] Scheduled: "${expression}" (category: ${categoryName || "auto"})`);
  }

  export async function stop() {
    if (currentJob) {
      currentJob.stop();
      currentJob = null;
    }

    await prisma.cronJob.upsert({
      where: { key: "ai-generator" },
      update: { active: false },
      create: { key: "ai-generator", expression: "0 0 * * *", active: false },
    });

    console.log("[AI Cron] Stopped");
  }

  /** Trigger one immediate run */
  export async function triggerOnce(category?: string) {
    return AiService.autoGenerate(category);
  }

  /** Restore schedule on server start */
  export async function restoreOnStartup() {
    const config = await prisma.cronJob.findUnique({
      where: { key: "ai-generator" },
      include: { category: { select: { name: true } } },
    });
    if (config?.active) {
      try {
        start(config.expression, config.category?.name || undefined);
      } catch (err) {
        console.error("[AI Cron] Failed to restore schedule:", err);
        await prisma.cronJob.update({
          where: { id: config.id },
          data: { active: false },
        });
      }
    }
  }
}
