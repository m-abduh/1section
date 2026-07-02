import Redis from "ioredis";
import { env } from "../config/env";

const redisUrl = env.redis.url;

let redis: Redis | null = null;

if (redisUrl) {
  redis = new Redis(redisUrl, {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      if (times > 3) return null;
      return Math.min(times * 200, 2000);
    },
    lazyConnect: true,
  });

  redis.on("error", (err) => {
    console.error("Redis error:", err.message);
  });
}

export async function connectRedis(): Promise<void> {
  if (!redis) {
    console.warn("REDIS_URL not set — skipping Redis connection");
    return;
  }
  try {
    await redis.connect();
    console.log("Redis connected");
  } catch (err) {
    console.error("Redis connection failed:", (err as Error).message);
  }
}

export async function disconnectRedis(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
  }
}

export function getRedis(): Redis | null {
  return redis;
}
