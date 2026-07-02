import cron, { ScheduledTask } from "node-cron";
import fs from "fs";
import path from "path";
import { AiService } from "./ai.service";

const CONFIG_PATH = path.join(__dirname, "..", "..", "..", "ai-cron.json");

interface CronConfig {
  expression: string;
  category?: string;
  createdAt: string;
}

let currentJob: ScheduledTask | null = null;

function loadConfig(): CronConfig | null {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));
    }
  } catch {
    console.warn("Failed to read cron config");
  }
  return null;
}

function saveConfig(config: CronConfig) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

function deleteConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) fs.unlinkSync(CONFIG_PATH);
  } catch { /* ignore */ }
}

async function executeJob() {
  console.log("[AI Cron] Auto-generating module...");
  try {
    const config = loadConfig();
    const module = await AiService.autoGenerate(config?.category);
    console.log(`[AI Cron] Module created: ${module.slug}`);
  } catch (err) {
    console.error("[AI Cron] Error:", err);
  }
}

export namespace AiCron {
  export function getSchedule() {
    const config = loadConfig();
    if (!config || !currentJob) return null;
    // Calculate next run time (simplified: based on cron expression pattern)
    return {
      expression: config.expression,
      category: config.category || null,
      createdAt: config.createdAt,
      isActive: true,
    };
  }

  export function start(expression: string, category?: string) {
    // Stop existing
    stop();

    // Validate cron expression
    if (!cron.validate(expression)) {
      throw new Error(`Invalid cron expression: ${expression}`);
    }

    saveConfig({ expression, category, createdAt: new Date().toISOString() });

    currentJob = cron.schedule(expression, () => {
      executeJob();
    });

    console.log(`[AI Cron] Scheduled: "${expression}" (category: ${category || "auto"})`);
  }

  export function stop() {
    if (currentJob) {
      currentJob.stop();
      currentJob = null;
    }
    deleteConfig();
    console.log("[AI Cron] Stopped");
  }

  /** Trigger one immediate run */
  export async function triggerOnce(category?: string) {
    return AiService.autoGenerate(category);
  }

  /** Restore schedule on server start */
  export function restoreOnStartup() {
    const config = loadConfig();
    if (config) {
      try {
        start(config.expression, config.category);
      } catch (err) {
        console.error("[AI Cron] Failed to restore schedule:", err);
        deleteConfig();
      }
    }
  }
}
