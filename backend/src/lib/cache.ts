import { getRedis } from "./redis";

const DEFAULT_TTL = 3600;

const CACHE_PREFIXES = {
  CATEGORIES_LIST: "cache:categories:list",
  MODULES_LIST: "cache:modules:list",
  MODULES_CATEGORIES: "cache:modules:categories",
  DAILY_FREE: "cache:modules:daily-free",
  DAILY_FREE_SLUG: "cache:modules:daily-free-slug",
} as const;

function buildKey(prefix: string, params?: Record<string, string | number | boolean | null | undefined>): string {
  if (!params) return prefix;
  const sorted = Object.keys(params).sort().map((k) => `${k}=${params[k] ?? ""}`).join("&");
  if (!sorted) return prefix;
  return `${prefix}:${sorted}`;
}

export namespace Cache {
  export async function get<T>(key: string): Promise<T | null> {
    const redis = getRedis();
    if (!redis) return null;
    try {
      const raw = await redis.get(key);
      if (!raw) return null;
      return JSON.parse(raw) as T;
    } catch (err) {
      console.error(`[Cache] get error for key "${key}":`, err);
      return null;
    }
  }

  export async function set<T>(key: string, data: T, ttl: number = DEFAULT_TTL): Promise<void> {
    const redis = getRedis();
    if (!redis) return;
    try {
      await redis.setex(key, ttl, JSON.stringify(data));
    } catch (err) {
      console.error(`[Cache] set error for key "${key}":`, err);
    }
  }

  export async function del(key: string): Promise<void> {
    const redis = getRedis();
    if (!redis) return;
    try {
      await redis.del(key);
    } catch (err) {
      console.error(`[Cache] del error for key "${key}":`, err);
    }
  }

  export async function delByPattern(pattern: string): Promise<void> {
    const redis = getRedis();
    if (!redis) return;
    try {
      let cursor = "0";
      do {
        const result = await redis.scan(cursor, "MATCH", pattern, "COUNT", "100");
        cursor = result[0];
        const keys = result[1];
        if (keys.length > 0) {
          await redis.del(...keys);
        }
      } while (cursor !== "0");
    } catch (err) {
      console.error(`[Cache] delByPattern error for pattern "${pattern}":`, err);
    }
  }

  export function key(prefix: string, params?: Record<string, string | number | boolean | null | undefined>): string {
    return buildKey(prefix, params);
  }

  export const PREFIXES = CACHE_PREFIXES;
}
