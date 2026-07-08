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
    const lockAcquired = await (redis as any).set(CRON_LOCK_KEY, "1", "EX", LOCK_TTL, "NX").catch(() => null);
    if (!lockAcquired) {
      console.log("[AI Cron] Another instance is executing, skipping");
      return;
    }
  }

  try {
    const config = await prisma.cronJob.findUnique({ where: { key: "ai-generator" } });
    const module = await AiService.autoGenerate(config?.category || undefined);
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
    const config = await prisma.cronJob.findUnique({ where: { key: "ai-generator" } });
    if (!config || !config.active || !currentJob) return null;
    return {
      expression: config.expression,
      category: config.category || null,
      createdAt: config.createdAt.toISOString(),
      isActive: config.active,
    };
  }

  export async function start(expression: string, category?: string) {
    stop();

    if (!cron.validate(expression)) {
      throw new Error(`Invalid cron expression: ${expression}`);
    }

    await prisma.cronJob.upsert({
      where: { key: "ai-generator" },
      update: { expression, category: category || null, active: true },
      create: { key: "ai-generator", expression, category: category || null, active: true },
    });

    currentJob = cron.schedule(expression, () => {
      executeJob();
    });

    console.log(`[AI Cron] Scheduled: "${expression}" (category: ${category || "auto"})`);
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
    const config = await prisma.cronJob.findUnique({ where: { key: "ai-generator" } });
    if (config?.active) {
      try {
        start(config.expression, config.category || undefined);
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
