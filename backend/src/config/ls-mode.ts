import { getRedis } from "../lib/redis";

const LS_MODE_KEY = "config:ls-mode";
const DEFAULT_MODE = process.env.NODE_ENV === "production" ? "prod" : "dev";
// Module-level mutable state — NOT thread-safe. In a multi-instance deployment,
// each process has its own copy so switching mode via dashboard only affects
// the instance that handled the request. For true sync, use Redis exclusively.
let localFallback: "dev" | "prod" = DEFAULT_MODE;

export async function getLsMode(): Promise<"dev" | "prod"> {
  const redis = getRedis();
  if (redis) {
    try {
      const val = await redis.get(LS_MODE_KEY);
      if (val === "dev" || val === "prod") return val;
    } catch (err) {
      console.error("getLsMode: redis fetch failed, using local fallback", err);
    }
  }
  return localFallback;
}

export async function setLsMode(newMode: "dev" | "prod"): Promise<void> {
  const redis = getRedis();
  if (redis) {
    try {
      await redis.set(LS_MODE_KEY, newMode);
    } catch (err) {
      console.error("setLsMode: redis write failed, using local fallback", err);
    }
  }
  localFallback = newMode;
}
