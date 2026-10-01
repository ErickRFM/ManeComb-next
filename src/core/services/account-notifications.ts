import { enqueueOutboxEvent } from "@/src/core/services/outbox";

type AccountNotice = {
  to:string;
  organizationId?:string|null;
  idempotencyKey:string;
  subject:string;
  heading:string;
  body:string;
};

export async function enqueueAccountNotice(input:AccountNotice){
  return enqueueOutboxEvent("email.send",{
    to:input.to,
    subject:input.subject,
    html:`<h1>${input.heading}</h1><p>${input.body}</p><p>Si no reconoces esta actividad, contacta al administrador de tu cuenta.</p>`
  },input.organizationId||null,input.idempotencyKey);
}
