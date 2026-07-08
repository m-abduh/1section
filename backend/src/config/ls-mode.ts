import { getRedis } from "../lib/redis";

const LS_MODE_KEY = "config:ls-mode";
const DEFAULT_MODE = process.env.NODE_ENV === "production" ? "prod" : "dev";
let localFallback: "dev" | "prod" = DEFAULT_MODE;

export async function getLsMode(): Promise<"dev" | "prod"> {
  const redis = getRedis();
  if (redis) {
    try {
      const val = await redis.get(LS_MODE_KEY);
      if (val === "dev" || val === "prod") return val;
    } catch {
      // fallback to local
    }
  }
  return localFallback;
}

export async function setLsMode(newMode: "dev" | "prod"): Promise<void> {
  const redis = getRedis();
  if (redis) {
    try {
      await redis.set(LS_MODE_KEY, newMode);
    } catch {
      // fallback to local
    }
  }
  localFallback = newMode;
}
