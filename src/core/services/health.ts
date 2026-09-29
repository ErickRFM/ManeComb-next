import { checkDb } from "@/src/lib/db";
import { checkRedis } from "@/src/lib/redis";
import { getEnv } from "@/src/lib/env";

export async function getSystemHealth() {
  const [database, redis] = await Promise.all([checkDb(), checkRedis()]);
  const env = getEnv();
  const integrations = {
    authSecret: Boolean(env.authSecret && env.authSecret.length >= 32),
    mfaEncryption: Boolean(env.mfaEncryptionKey && env.mfaEncryptionKey.length >= 32),
    resend: Boolean(env.resendApiKey),
    mapbox: Boolean(env.mapboxToken),
    mercadoPagoWebhook: Boolean(env.mercadoPagoWebhookSecret),
    mercadoPagoAccess: Boolean(env.mercadoPagoAccessToken),
    webPush: Boolean(env.webPushPublicKey && env.webPushPrivateKey && env.webPushSubject),
    cloudinary: Boolean(env.cloudinaryCloudName && env.cloudinaryApiKey && env.cloudinaryApiSecret)
  };
  const missing = Object.entries(integrations).filter(([,ready])=>!ready).map(([name])=>name);
  const infrastructureReady = database.ok && redis.ok;
  const productionIntegrationsReady = process.env.NODE_ENV !== "production" || missing.length === 0;
  const status = infrastructureReady && productionIntegrationsReady ? "ok" : "degraded";
  return { status, database, redis, integrations, missing, timestamp: new Date().toISOString() };
}
