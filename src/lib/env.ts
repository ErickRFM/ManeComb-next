export type ManeCombEnv = {
  appUrl: string;
  authSecret: string | null;
  mfaEncryptionKey: string | null;
  mongodbUri: string | null;
  redisUrl: string | null;
  mapboxToken: string | null;
  resendApiKey: string | null;
  emailFrom: string;
  mercadoPagoWebhookSecret: string | null;
  mercadoPagoAccessToken: string | null;
  webPushPublicKey: string | null;
  webPushPrivateKey: string | null;
  webPushSubject: string | null;
};

export function getEnv(): ManeCombEnv {
  return {
    appUrl: process.env.APP_URL || "http://localhost:3000",
    authSecret: process.env.AUTH_SECRET || null,
    mfaEncryptionKey: process.env.MFA_ENCRYPTION_KEY || null,
    mongodbUri: process.env.MONGODB_URI || null,
    redisUrl: process.env.REDIS_URL || null,
    mapboxToken: process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || null,
    resendApiKey: process.env.RESEND_API_KEY || null,
    emailFrom: process.env.EMAIL_FROM || "ManeComb <no-reply@example.com>",
    mercadoPagoWebhookSecret: process.env.MERCADO_PAGO_WEBHOOK_SECRET || null,
    mercadoPagoAccessToken: process.env.MERCADOPAGO_ACCESS_TOKEN || null,
    webPushPublicKey: process.env.NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY || null,
    webPushPrivateKey: process.env.WEB_PUSH_VAPID_PRIVATE_KEY || null,
    webPushSubject: process.env.WEB_PUSH_SUBJECT || null
  };
}

export function requireEnv<K extends keyof ManeCombEnv>(key: K): NonNullable<ManeCombEnv[K]> {
  const value = getEnv()[key];
  if (value === null || value === "") throw new Error("Missing required environment value: " + key);
  return value as NonNullable<ManeCombEnv[K]>;
}
