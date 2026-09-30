import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export function validateDeploymentEnvironment(env, role = "web") {
  const errors = [];
  const environment = env.DEPLOYMENT_ENVIRONMENT || "production";
  const value = key => String(env[key] || "").trim();
  const requireValue = key => {
    const result = value(key);
    if (!result || /placeholder|changeme|replace[_-]?me|your[_-]|example\.com/i.test(result)) errors.push(key + " requires a configured value");
    return result;
  };
  if (!["web", "worker"].includes(role)) errors.push("role must be web or worker");
  if (!["production", "staging"].includes(environment)) errors.push("DEPLOYMENT_ENVIRONMENT must be production or staging");
  const mongo = requireValue("MONGODB_URI");
  const database = mongo.match(/^mongodb(?:\+srv)?:\/\/[^/]+\/([^?]+)(?:\?|$)/)?.[1];
  if (database !== (environment === "staging" ? "manecomb_staging" : "manecomb")) errors.push("MONGODB_URI must use the explicit database for this environment");
  const redis = requireValue("REDIS_URL");
  try { if (!["redis:", "rediss:"].includes(new URL(redis).protocol)) throw new Error(); }
  catch { errors.push("REDIS_URL must use redis or rediss"); }
  const namespace = requireValue("REDIS_NAMESPACE");
  if (!/^[A-Za-z0-9_-]+$/.test(namespace) || !namespace.includes(environment === "staging" ? "staging" : "prod")) errors.push("REDIS_NAMESPACE must isolate this environment");
  if (!requireValue("RESEND_API_KEY").startsWith("re_")) errors.push("RESEND_API_KEY format is invalid");
  requireValue("EMAIL_FROM");
  const publicVapid = requireValue("NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY");
  const privateVapid = requireValue("WEB_PUSH_VAPID_PRIVATE_KEY");
  if (Buffer.from(publicVapid, "base64url").length !== 65 || Buffer.from(privateVapid, "base64url").length !== 32) errors.push("Web Push VAPID key lengths are invalid");
  const subject = requireValue("WEB_PUSH_SUBJECT");
  if (!/^(mailto:|https:\/\/)/.test(subject)) errors.push("WEB_PUSH_SUBJECT must use mailto or https");
  if (role === "web") {
    try {
      const url = new URL(requireValue("APP_URL"));
      if (url.protocol !== "https:" || url.username || url.password) throw new Error();
    } catch { errors.push("APP_URL must be an HTTPS URL without credentials"); }
    for (const key of ["AUTH_SECRET", "MFA_ENCRYPTION_KEY"]) if (requireValue(key).length < 32) errors.push(key + " must contain at least 32 characters");
    if (value("AUTH_SECRET") === value("MFA_ENCRYPTION_KEY")) errors.push("AUTH_SECRET and MFA_ENCRYPTION_KEY must differ");
    if (!requireValue("NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN").startsWith("pk.")) errors.push("Mapbox requires a public pk token");
    requireValue("MERCADO_PAGO_WEBHOOK_SECRET");
    const mp = requireValue("MERCADOPAGO_ACCESS_TOKEN");
    if (!mp.startsWith(environment === "staging" ? "TEST-" : "APP_USR-")) errors.push("Mercado Pago token must match the deployment environment");
    for (const key of ["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"]) requireValue(key);
    const stun = requireValue("RTC_STUN_URLS");
    const turn = requireValue("RTC_TURN_URLS");
    if (!stun.split(",").every(item => /^stuns?:\S+$/.test(item.trim()))) errors.push("RTC_STUN_URLS contains an invalid URI");
    if (!turn.split(",").every(item => /^turns?:\S+$/.test(item.trim()))) errors.push("RTC_TURN_URLS contains an invalid URI");
    if (!value("RTC_TURN_SECRET") && !(value("RTC_TURN_USERNAME") && value("RTC_TURN_CREDENTIAL"))) errors.push("TURN credentials are required");
  }
  return errors;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const role = process.argv.find(arg => arg.startsWith("--role="))?.split("=")[1] || "web";
  const errors = validateDeploymentEnvironment(process.env, role);
  for (const error of errors) console.error("[deploy-check:" + role + "] " + error);
  if (errors.length) process.exitCode = 1;
  else console.log("[deploy-check:" + role + "] environment contract OK (live provider validation remains a release gate)");
}
