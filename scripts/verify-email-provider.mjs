import { Resend } from "resend";

const required=["RESEND_API_KEY","EMAIL_FROM","EMAIL_SMOKE_TO"];
for(const key of required){
  if(!String(process.env[key]||"").trim()){
    console.error("[verify:email] missing "+key);
    process.exit(1);
  }
}

if(!process.env.RESEND_API_KEY.startsWith("re_")){
  console.error("[verify:email] RESEND_API_KEY format is invalid");
  process.exit(1);
}

const resend=new Resend(process.env.RESEND_API_KEY);
const idempotencyKey="manecomb-provider-smoke/"+new Date().toISOString().slice(0,10);
const result=await resend.emails.send({
  from:process.env.EMAIL_FROM,
  to:process.env.EMAIL_SMOKE_TO,
  subject:"ManeComb provider smoke test",
  html:"<p>ManeComb confirmó acceso al proveedor de correo desde este entorno.</p>"
},{idempotencyKey});

if(result.error||!result.data?.id){
  console.error("[verify:email] provider rejected the smoke test");
  process.exit(1);
}
console.log("[verify:email] accepted by provider:",result.data.id);
