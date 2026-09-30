import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCommercialPlan } from "@/src/core/domain/commercial-plans";
import { CheckoutIdempotency } from "@/src/core/models/CheckoutIdempotency";
import { User } from "@/src/core/models/User";
import { Subscription } from "@/src/core/models/Subscription";
import { mercadoPagoRequest } from "@/src/core/services/billing";
import { writeAudit } from "@/src/core/services/audit";
import { requireApiSession } from "@/src/lib/auth";
import { assertPermission } from "@/src/lib/authorization";
import { connectDb } from "@/src/lib/db";
import { getEnv } from "@/src/lib/env";
import { apiError } from "@/src/lib/http";
import { enforceRateLimit } from "@/src/lib/rate-limit";

const Input=z.object({planId:z.string().min(1),idempotencyKey:z.string().min(8).max(200).optional()});
export const runtime="nodejs";

export async function POST(request:Request){
  try{
    const session=assertPermission(await requireApiSession(request,["company_portal"]),"manage_billing");
    if(!session.organizationId) throw new Error("FORBIDDEN");
    await enforceRateLimit(request,"commercial:checkout",{limit:10,windowSeconds:600,identity:session.organizationId});
    const {planId,idempotencyKey}=Input.parse(await request.json());
    const plan=getCommercialPlan(planId);
    if(!plan) return NextResponse.json({error:"Unknown plan"},{status:404});

    const env=getEnv();
    if(!env.mercadoPagoAccessToken) return NextResponse.json({error:"Mercado Pago is not configured"},{status:503});

    await connectDb();
    await CheckoutIdempotency.init();
    const existing=await CheckoutIdempotency.findOne({organizationId:session.organizationId,status:{$in:["created","pending"]}}).sort({createdAt:-1});
    if(existing&&existing.planCode!==plan.code)return NextResponse.json({error:"PENDING_CHECKOUT_DIFFERENT_PLAN"},{status:409});
    if(existing?.initPoint) return NextResponse.json({checkoutId:String(existing._id),initPoint:existing.initPoint,reused:true});
    const subscription = await Subscription.findOne({organizationId:session.organizationId});
    if(subscription && subscription.status !== "cancelled" && subscription.status !== "trial") return NextResponse.json({error:"USE_SUBSCRIPTION_CHANGE"},{status:409});
    // Persist the provider key before I/O. Retries and concurrent browsers share it.
    const attempt = existing || await CheckoutIdempotency.findOneAndUpdate(
      {organizationId:session.organizationId,activeIntent:true},
      {$setOnInsert:{organizationId:session.organizationId,planCode:plan.code,key:randomUUID(),activeIntent:true,status:"created"}},
      {upsert:true,new:true}
    );
    const key=attempt.key;
    if(attempt.planCode!==plan.code)return NextResponse.json({error:"PENDING_CHECKOUT_DIFFERENT_PLAN"},{status:409});

    const user=await User.findById(session.sub).lean();
    const email=(user as any)?.email;
    if(!email) throw new Error("Authenticated user email not found");

    const externalReference=["manecomb",session.organizationId,plan.code].join("|");
    const provider=await mercadoPagoRequest("/preapproval",{
      method:"POST",
      headers:{"content-type":"application/json",authorization:"Bearer "+env.mercadoPagoAccessToken,"X-Idempotency-Key":key},
      body:JSON.stringify({
        reason:"ManeComb "+plan.label,
        payer_email:email,
        external_reference:externalReference,
        back_url:env.appUrl+"/portal/facturacion",
        auto_recurring:{frequency:1,frequency_type:"months",transaction_amount:plan.monthlyMxn,currency_id:"MXN"}
      })
    });

    if(!provider.id || typeof provider.init_point !== "string" || !/^https:\/\/([a-z0-9-]+\.)?mercadopago\.com(?:\.[a-z]{2})?\//i.test(provider.init_point)) throw new Error("BILLING_PROVIDER_UNAVAILABLE");

    const checkout=await CheckoutIdempotency.findOneAndUpdate(
      {_id:attempt._id,status:{$in:["created","pending"]}},
      {$set:{providerSubscriptionId:String(provider.id),initPoint:provider.init_point,status:"pending"}},
      {new:true}
    );
    if(!checkout) return NextResponse.json({error:"CHECKOUT_RECONCILIATION_REQUIRED"},{status:409});
    await writeAudit({organizationId:session.organizationId,actorUserId:session.sub,action:"checkout.provider_created",entityType:"CheckoutIdempotency",entityId:String(checkout._id),metadata:{providerId:String(provider.id),planCode:plan.code}});
    return NextResponse.json({checkoutId:String(checkout._id),initPoint:provider.init_point});
  }catch(error){if(error instanceof Error && error.message === "BILLING_PROVIDER_UNAVAILABLE")return NextResponse.json({error:error.message},{status:502});return apiError(error)}
}
