import { checkDb } from "@/src/lib/db";
import { checkRedis } from "@/src/lib/redis";
import { getEnv } from "@/src/lib/env";

export async function getSystemHealth() {
  const [database, redis] = await Promise.all([checkDb(), checkRedis()]);
  const env = getEnv();
  const integrations = {
    resend: Boolean(env.resendApiKey),
    mapbox: Boolean(env.mapboxToken),
    mercadoPago: Boolean(env.mercadoPagoWebhookSecret && env.mercadoPagoAccessToken),
    webPush: Boolean(env.webPushPublicKey && env.webPushPrivateKey && env.webPushSubject),
    cloudinary: Boolean(env.cloudinaryCloudName && env.cloudinaryApiKey && env.cloudinaryApiSecret),
    mfaEncryption: Boolean(env.mfaEncryptionKey && env.mfaEncryptionKey.length >= 32)
  };
  const infrastructureOk = database.ok && redis.ok;
  const integrationsReady = Object.values(integrations).every(Boolean);
  return {
    status: infrastructureOk ? "ok" : "degraded",
    readiness: infrastructureOk && integrationsReady ? "ready" : "not_ready",
    database,
    redis,
    integrations,
    timestamp: new Date().toISOString()
  };
}
