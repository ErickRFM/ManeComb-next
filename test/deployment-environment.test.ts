import { expect, it } from "vitest";
import { validateDeploymentEnvironment } from "../scripts/predeploy-check.mjs";
const fixture = {
  DEPLOYMENT_ENVIRONMENT:"production",MONGODB_URI:"mongodb+srv://user:private-password@cluster.invalid/manecomb",
  REDIS_URL:"rediss://cache.invalid:6379",REDIS_NAMESPACE:"manecomb-next-prod",RESEND_API_KEY:"re_synthetic",
  EMAIL_FROM:"ManeComb <billing@manecomb.com>",NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY:Buffer.alloc(65).toString("base64url"),
  WEB_PUSH_VAPID_PRIVATE_KEY:Buffer.alloc(32).toString("base64url"),WEB_PUSH_SUBJECT:"mailto:billing@manecomb.com",
  APP_URL:"https://manecomb.com",AUTH_SECRET:"a".repeat(64),MFA_ENCRYPTION_KEY:"b".repeat(64),NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN:"pk.synthetic",
  MERCADO_PAGO_WEBHOOK_SECRET:"synthetic",MERCADOPAGO_ACCESS_TOKEN:"APP_USR-synthetic",CLOUDINARY_CLOUD_NAME:"synthetic",CLOUDINARY_API_KEY:"synthetic",CLOUDINARY_API_SECRET:"synthetic",
  RTC_STUN_URLS:"stun:stun.invalid:3478",RTC_TURN_URLS:"turns:turn.invalid:5349",RTC_TURN_SECRET:"synthetic"
};
it("accepts structurally valid production and isolated staging contracts",()=>{
  expect(validateDeploymentEnvironment(fixture)).toEqual([]);
  expect(validateDeploymentEnvironment({...fixture,DEPLOYMENT_ENVIRONMENT:"staging",MONGODB_URI:fixture.MONGODB_URI.replace("/manecomb","/manecomb_staging"),REDIS_NAMESPACE:"manecomb-next-staging",MERCADOPAGO_ACCESS_TOKEN:"TEST-synthetic"})).toEqual([]);
});
it.each([
  {MONGODB_URI:"mongodb://cluster.invalid/test"},
  {MONGODB_URI:"mongodb://cluster.invalid"},
  {REDIS_NAMESPACE:"legacy"},
  {AUTH_SECRET:fixture.MFA_ENCRYPTION_KEY},
  {MERCADOPAGO_ACCESS_TOKEN:"TEST-synthetic"},
  {NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN:"sk.private"},
  {RESEND_API_KEY:"re_placeholder"},
  {RTC_TURN_SECRET:""}
])("fails closed on unsafe production configuration without exposing values: %j",input=>{
  const errors=validateDeploymentEnvironment({...fixture,...input});
  expect(errors.length).toBeGreaterThan(0);
  expect(errors.join(" ")).not.toContain("private-password");
});
