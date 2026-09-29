import { NextResponse } from "next/server";
import { connectDb } from "@/src/lib/db";
import { getEnv } from "@/src/lib/env";
import { WebhookEvent } from "@/src/core/models/WebhookEvent";
import { Subscription } from "@/src/core/models/Subscription";
import { CheckoutIdempotency } from "@/src/core/models/CheckoutIdempotency";
import { verifyMercadoPagoWebhook } from "@/src/core/services/mercadopago";
import { getCommercialPlan } from "@/src/core/domain/commercial-plans";
import { writeAudit } from "@/src/core/services/audit";

export const runtime = "nodejs";

function parseExternalReference(value:unknown){
  const [prefix,organizationId,planCode]=String(value||"").split("|");
  return prefix==="manecomb"&&organizationId&&planCode?{organizationId,planCode}:null;
}

export async function POST(request: Request) {
  const env=getEnv();
  if (!env.mercadoPagoWebhookSecret) return NextResponse.json({ error: "Webhook secret not configured" }, { status: 503 });
  if (!env.mercadoPagoAccessToken) return NextResponse.json({ error: "Mercado Pago access token not configured" }, { status: 503 });

  const url = new URL(request.url);
  const payload = await request.json().catch(() => ({}));
  const dataId = String(url.searchParams.get("data.id") || payload?.data?.id || "");
  const valid = verifyMercadoPagoWebhook({
    signature: request.headers.get("x-signature"),
    requestId: request.headers.get("x-request-id"),
    dataId,
    secret: env.mercadoPagoWebhookSecret
  });
  if (!valid) return NextResponse.json({ error: "Invalid signature" }, { status: 401 });

  await connectDb();
  const eventId = String(payload?.id || request.headers.get("x-request-id") || (String(payload?.type||"event")+":"+dataId));
  const event=await WebhookEvent.findOneAndUpdate(
    { provider: "mercadopago", eventId },
    { $setOnInsert: { provider: "mercadopago", eventId, payload } },
    { upsert: true, new: true }
  );
  if(event.processedAt) return NextResponse.json({ok:true,reused:true});

  const type=String(payload?.type||payload?.action||"");
  const preapproval=type.includes("preapproval")||type.includes("subscription");
  const endpoint=preapproval?"https://api.mercadopago.com/preapproval/"+encodeURIComponent(dataId):"https://api.mercadopago.com/v1/payments/"+encodeURIComponent(dataId);
  const providerResponse=await fetch(endpoint,{headers:{authorization:"Bearer "+env.mercadoPagoAccessToken}});
  const provider=await providerResponse.json().catch(()=>({}));
  if(!providerResponse.ok) return NextResponse.json({error:"Mercado Pago reconciliation failed"},{status:502});

  const ref=parseExternalReference(provider.external_reference);
  if(ref){
    const plan=getCommercialPlan(ref.planCode);
    if(plan){
      const rawStatus=String(provider.status||"");
      const active=rawStatus==="authorized"||rawStatus==="approved";
      const cancelled=["cancelled","cancelled_by_user","paused"].includes(rawStatus);
      const status=active?"active":cancelled?"cancelled":"past_due";
      await Subscription.findOneAndUpdate(
        {organizationId:ref.organizationId},
        {$set:{
          planCode:plan.code,
          status,
          provider:"mercadopago",
          providerSubscriptionId:String(provider.id||dataId),
          vehicleLimit:plan.units,
          currentPeriodEnd:provider.next_payment_date?new Date(provider.next_payment_date):undefined
        }},
        {upsert:true,new:true,setDefaultsOnInsert:true}
      );
      await CheckoutIdempotency.updateMany(
        {organizationId:ref.organizationId,planCode:plan.code},
        {$set:{status:active?"active":cancelled?"cancelled":"pending",providerSubscriptionId:String(provider.id||dataId)}}
      );
      await writeAudit({organizationId:ref.organizationId,action:"subscription.mercadopago."+rawStatus,entityType:"Subscription",entityId:String(provider.id||dataId),metadata:{planCode:plan.code,status:rawStatus}});
    }
  }

  event.processedAt=new Date();
  await event.save();
  return NextResponse.json({ ok: true });
}
