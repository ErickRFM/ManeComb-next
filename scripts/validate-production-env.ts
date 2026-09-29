const env = process.env;
const errors: string[] = [];

function requireValue(name: string, minLength = 1) {
  const value = env[name]?.trim() || "";
  if (!value || value.length < minLength || /replace-with|USER:PASSWORD|HOST/.test(value)) {
    errors.push(name + " is missing, too short or still uses a placeholder");
  }
  return value;
}

const appUrl = requireValue("APP_URL", 8);
const authSecret = requireValue("AUTH_SECRET", 32);
const mfaEncryptionKey = requireValue("MFA_ENCRYPTION_KEY", 32);
requireValue("MONGODB_URI", 12);
requireValue("REDIS_URL", 8);
const mapbox = requireValue("NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN", 10);
requireValue("RESEND_API_KEY", 8);
requireValue("EMAIL_FROM", 5);
requireValue("MERCADO_PAGO_WEBHOOK_SECRET", 16);
requireValue("MERCADOPAGO_ACCESS_TOKEN", 16);
requireValue("NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY", 20);
requireValue("WEB_PUSH_VAPID_PRIVATE_KEY", 20);
const webPushSubject = requireValue("WEB_PUSH_SUBJECT", 8);
requireValue("CLOUDINARY_CLOUD_NAME", 2);
requireValue("CLOUDINARY_API_KEY", 4);
requireValue("CLOUDINARY_API_SECRET", 8);

if (appUrl && !appUrl.startsWith("https://")) errors.push("APP_URL must use HTTPS in production");
if (authSecret && mfaEncryptionKey && authSecret === mfaEncryptionKey) errors.push("AUTH_SECRET and MFA_ENCRYPTION_KEY must be different");
if (mapbox && !mapbox.startsWith("pk.")) errors.push("NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN must be a public Mapbox token");
if (webPushSubject && !/^mailto:|^https:\/\//.test(webPushSubject)) errors.push("WEB_PUSH_SUBJECT must be mailto: or https://");

if (errors.length) {
  console.error("[production-env] NOT READY");
  for (const error of errors) console.error(" - " + error);
  process.exitCode = 1;
} else {
  console.log("[production-env] READY: required production configuration is present and structurally valid");
}
