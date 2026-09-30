const env=process.env;
const errors=[];
const warnings=[];

function required(key){
  const value=String(env[key]||"").trim();
  if(!value)errors.push(key+" is required");
  return value;
}

function minLength(key,length){
  const value=required(key);
  if(value&&value.length<length)errors.push(key+" must be at least "+length+" characters");
}

function httpsUrl(key){
  const value=required(key);
  if(!value)return;
  try{
    const url=new URL(value);
    if(url.protocol!=="https:")errors.push(key+" must use https in production");
  }catch{
    errors.push(key+" must be a valid URL");
  }
}

httpsUrl("APP_URL");
minLength("AUTH_SECRET",32);
minLength("MFA_ENCRYPTION_KEY",32);
required("MONGODB_URI");
required("REDIS_URL");
required("REDIS_NAMESPACE");
required("NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN");
required("RESEND_API_KEY");
required("EMAIL_FROM");
required("MERCADO_PAGO_WEBHOOK_SECRET");
required("MERCADOPAGO_ACCESS_TOKEN");
required("NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY");
required("WEB_PUSH_VAPID_PRIVATE_KEY");
required("WEB_PUSH_SUBJECT");
required("CLOUDINARY_CLOUD_NAME");
required("CLOUDINARY_API_KEY");
required("CLOUDINARY_API_SECRET");
required("RTC_STUN_URLS");
required("RTC_TURN_URLS");

const turnSecret=String(env.RTC_TURN_SECRET||"").trim();
const turnUser=String(env.RTC_TURN_USERNAME||"").trim();
const turnCredential=String(env.RTC_TURN_CREDENTIAL||"").trim();
if(!turnSecret&&!(turnUser&&turnCredential)){
  errors.push("TURN requires RTC_TURN_SECRET or RTC_TURN_USERNAME + RTC_TURN_CREDENTIAL");
}

if(String(env.EMAIL_FROM||"").includes("example.com"))warnings.push("EMAIL_FROM still uses example.com");
if(String(env.REDIS_NAMESPACE||"").includes("local"))warnings.push("REDIS_NAMESPACE looks like a local namespace");
if(String(env.NODE_ENV||"")!=="production")warnings.push("NODE_ENV is not production");

if(warnings.length){
  console.warn("[deploy-check] warnings:");
  for(const warning of warnings)console.warn(" - "+warning);
}
if(errors.length){
  console.error("[deploy-check] blocked:");
  for(const error of errors)console.error(" - "+error);
  process.exit(1);
}
console.log("[deploy-check] production environment contract OK");
