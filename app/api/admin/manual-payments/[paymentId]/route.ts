import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiSession } from "@/src/lib/auth";
import { connectDb } from "@/src/lib/db";
import { apiError } from "@/src/lib/http";
import { ManualPayment } from "@/src/core/models/ManualPayment";
import { Organization } from "@/src/core/models/Organization";
import { Subscription } from "@/src/core/models/Subscription";
import { getCommercialPlan } from "@/src/core/domain/commercial-plans";
import { writeAudit } from "@/src/core/services/audit";

const Input=z.object({status:z.enum(["approved","rejected"]),note:z.string().max(500).optional()});
export const runtime="nodejs";

export async function PATCH(request:Request,{params}:{params:Promise<{paymentId:string}>}){
  try{
    const session=await requireApiSession(request,["platform_admin"]);
    const {paymentId}=await params;
    const input=Input.parse(await request.json());
    await connectDb();

    const payment=await ManualPayment.findOne({_id:paymentId,status:"pending"});
    if(!payment) return NextResponse.json({error:"Payment not found or already reviewed"},{status:404});
    const plan=getCommercialPlan(payment.planCode);
    if(!plan) return NextResponse.json({error:"PAYMENT_PLAN_INVALID"},{status:409});
    if(Math.round(Number(payment.amountMxn)*100)!==Math.round(plan.monthlyMxn*100) ||
       Math.round(Number(payment.expectedAmountMxn)*100)!==Math.round(plan.monthlyMxn*100)){
      return NextResponse.json({error:"PAYMENT_AMOUNT_MISMATCH",expectedAmountMxn:plan.monthlyMxn},{status:409});
    }

    payment.status=input.status;
    payment.note=input.note;
    payment.reviewedBy=session.sub;
    payment.reviewedAt=new Date();
    await payment.save();

    if(input.status==="approved"){
      await Subscription.findOneAndUpdate(
        {organizationId:payment.organizationId},
        {$set:{
          planCode:plan.code,
          status:"active",
          provider:"manual",
          vehicleLimit:plan.units,
          currentPeriodEnd:new Date(Date.now()+30*24*60*60*1000)
        }},
        {upsert:true,new:true,setDefaultsOnInsert:true}
      );
      await Organization.updateOne({_id:payment.organizationId},{$set:{planCode:plan.code,status:"active"}});
    }

    await writeAudit({
      actorUserId:session.sub,
      organizationId:String(payment.organizationId),
      action:"manual_payment."+input.status,
      entityType:"ManualPayment",
      entityId:String(payment._id),
      metadata:{planCode:plan.code,amountMxn:payment.amountMxn,expectedAmountMxn:plan.monthlyMxn,currency:"MXN",periodMonths:1}
    });
    return NextResponse.json({payment});
  }catch(error){return apiError(error)}
}
