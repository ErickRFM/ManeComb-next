import { Resend } from "resend";
import { getEnv } from "@/src/lib/env";

export async function sendTransactionalEmail(input: { to: string; subject: string; html: string },options?:{idempotencyKey:string}) {
  const env = getEnv();
  if (!env.resendApiKey) throw new Error("RESEND_API_KEY is not configured");
  const resend = new Resend(env.resendApiKey);
  const result=await resend.emails.send({ from: env.emailFrom, to: input.to, subject: input.subject, html: input.html },options);
  if(result.error||!result.data?.id)throw new Error("EMAIL_PROVIDER_REJECTED");
  return result.data;
}
