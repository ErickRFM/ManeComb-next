import { ensureRedis } from "@/src/lib/redis";

const FLOOR_TTL_MS = 10_000;
const FLOOR_PREFIX = "manecomb:radio:floor:";
const localFloors = new Map<string, string>();

const REFRESH_SCRIPT = "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('pexpire', KEYS[1], ARGV[2]) else return 0 end";
const RELEASE_SCRIPT = "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end";

function key(organizationId: string, channelId: string) {
  return FLOOR_PREFIX + organizationId + ":" + channelId;
}

async function redisOrDevFallback() {
  const redis = await ensureRedis().catch(() => null);
  if (redis) return redis;
  if (process.env.NODE_ENV === "production") {
    throw new Error("RADIO_REDIS_UNAVAILABLE");
  }
  return null;
}

export async function acquireRadioFloor(organizationId: string, channelId: string, owner: string) {
  const floorKey = key(organizationId, channelId);
  const redis = await redisOrDevFallback();
  if (!redis) {
    const current = localFloors.get(floorKey);
    if (current && current !== owner) return false;
    localFloors.set(floorKey, owner);
    return true;
  }
  const result = await redis.set(floorKey, owner, "PX", FLOOR_TTL_MS, "NX");
  if (result === "OK") return true;
  return (await redis.get(floorKey)) === owner;
}

export async function refreshRadioFloor(organizationId: string, channelId: string, owner: string) {
  const floorKey = key(organizationId, channelId);
  const redis = await redisOrDevFallback();
  if (!redis) return localFloors.get(floorKey) === owner;
  const result = await redis.eval(REFRESH_SCRIPT, 1, floorKey, owner, String(FLOOR_TTL_MS));
  return Number(result) === 1;
}

export async function releaseRadioFloor(organizationId: string, channelId: string, owner: string) {
  const floorKey = key(organizationId, channelId);
  const redis = await redisOrDevFallback();
  if (!redis) {
    if (localFloors.get(floorKey) === owner) localFloors.delete(floorKey);
    return;
  }
  await redis.eval(RELEASE_SCRIPT, 1, floorKey, owner);
}

export function radioRoom(organizationId: string, channelId: string) {
  return "org:" + organizationId + ":radio:" + channelId;
}
