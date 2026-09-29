import { checkDb } from "@/src/lib/db";
import { checkRedis } from "@/src/lib/redis";
import { getEnv } from "@/src/lib/env";

export async function getSystemHealth() {
  const [database, redis] = await Promise.all([checkDb(), checkRedis()]);
  const integrations = {
    resend: Boolean(getEnv().resendApiKey),
    mapbox: Boolean(getEnv().mapboxToken),
    mercadoPagoWebhook: Boolean(getEnv().mercadoPagoWebhookSecret)
  };
  const status = database.ok && redis.ok ? "ok" : "degraded";
  return { status, database, redis, integrations, timestamp: new Date().toISOString() };
}
