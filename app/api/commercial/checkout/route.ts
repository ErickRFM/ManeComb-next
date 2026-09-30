import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCommercialPlan } from "@/src/core/domain/commercial-plans";
import { CheckoutIdempotency } from "@/src/core/models/CheckoutIdempotency";
import { User } from "@/src/core/models/User";
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
    const key=idempotencyKey||randomUUID();
    const existing=await CheckoutIdempotency.findOne({organizationId:session.organizationId,key});
    if(existing?.initPoint) return NextResponse.json({checkoutId:String(existing._id),initPoint:existing.initPoint,reused:true});

    const user=await User.findById(session.sub).lean();
    const email=(user as any)?.email;
    if(!email) throw new Error("Authenticated user email not found");

    const externalReference=["manecomb",session.organizationId,plan.code].join("|");
    const response=await fetch("https://api.mercadopago.com/preapproval",{
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

    const provider=await response.json().catch(()=>({}));
    if(!response.ok) return NextResponse.json({error:"Mercado Pago checkout failed",provider},{status:502});

    const checkout=await CheckoutIdempotency.findOneAndUpdate(
      {organizationId:session.organizationId,key},
      {$setOnInsert:{organizationId:session.organizationId,key,planCode:plan.code},$set:{providerSubscriptionId:provider.id,initPoint:provider.init_point,status:"pending"}},
      {upsert:true,new:true}
    );
    return NextResponse.json({checkoutId:String(checkout._id),initPoint:provider.init_point});
  }catch(error){return apiError(error)}
}
