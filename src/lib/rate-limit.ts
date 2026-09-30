import { createHash } from "node:crypto";
import { ensureRedis } from "@/src/lib/redis";
import { redisKey } from "@/src/lib/runtime-namespace";

type Options = { limit: number; windowSeconds: number; identity?: string };
type LocalEntry = { count: number; resetAt: number };

const local = new Map<string, LocalEntry>();
const SCRIPT = "local current=redis.call('incr',KEYS[1]); if current==1 then redis.call('expire',KEYS[1],ARGV[1]); end; return current";

function clientAddress(request: Request) {
  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-real-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

function digest(value: string) {
  return createHash("sha256").update(value).digest("hex").slice(0, 32);
}

export async function enforceRateLimit(request: Request, scope: string, options: Options) {
  const identity = options.identity?.trim().toLowerCase() || "";
  const key = redisKey("rate",scope,digest(clientAddress(request) + ":" + identity));
  const redis = await ensureRedis().catch(() => null);

  let count = 0;
  if (redis) {
    count = Number(await redis.eval(SCRIPT, 1, key, String(options.windowSeconds)));
  } else {
    if (process.env.NODE_ENV === "production") throw new Error("RATE_LIMIT_UNAVAILABLE");
    const now = Date.now();
    const current = local.get(key);
    if (!current || current.resetAt <= now) {
      local.set(key, { count: 1, resetAt: now + options.windowSeconds * 1000 });
      count = 1;
    } else {
      current.count += 1;
      count = current.count;
    }
  }

  if (count > options.limit) throw new Error("RATE_LIMITED");
}
