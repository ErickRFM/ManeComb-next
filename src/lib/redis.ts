import Redis from "ioredis";
import { getEnv } from "@/src/lib/env";

let client: Redis | null = null;

export function getRedis() {
  const url = getEnv().redisUrl;
  if (!url) return null;
  if (!client) client = new Redis(url, { maxRetriesPerRequest: null, enableReadyCheck: true, lazyConnect: true });
  return client;
}

export async function ensureRedis() {
  const redis = getRedis();
  if (!redis) return null;
  if (redis.status === "wait") await redis.connect();
  return redis;
}

export async function checkRedis() {
  try {
    const redis = await ensureRedis();
    if (!redis) return { ok: false as const, error: "REDIS_URL is not configured" };
    await redis.ping();
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : "redis unavailable" };
  }
}
