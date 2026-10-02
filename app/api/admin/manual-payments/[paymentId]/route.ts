import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { z } from "zod";
import { requireApiSession } from "@/src/lib/auth";
import { connectDb } from "@/src/lib/db";
import { apiError } from "@/src/lib/http";
import { assertPlatformPermission } from "@/src/core/platform/permissions";
import { ManualPayment } from "@/src/core/models/ManualPayment";
import { Organization } from "@/src/core/models/Organization";
import { Subscription } from "@/src/core/models/Subscription";
import { getCommercialPlan } from "@/src/core/domain/commercial-plans";
import { writeAudit } from "@/src/core/services/audit";
import { addCalendarMonth } from "@/src/core/services/billing";

const Input=z.object({status:z.enum(["approved","rejected"]),note:z.string().max(500).optional()});
export const runtime="nodejs";

export async function PATCH(request:Request,{params}:{params:Promise<{paymentId:string}>}){
  try{
    const session=await requireApiSession(request,["platform_admin"]);
    assertPlatformPermission(session,"platform.billing.review");
    const {paymentId}=await params;
    const input=Input.parse(await request.json());
    await connectDb();

    const payment = await mongoose.connection.transaction(async transaction => {
    const payment=await ManualPayment.findById(paymentId).session(transaction);
    if(!payment) throw new Error("PAYMENT_NOT_FOUND");
    if(payment.status === input.status) return payment;
    if(payment.status !== "pending") throw new Error("PAYMENT_ALREADY_REVIEWED");
    const plan=getCommercialPlan(payment.planCode);
    if(!plan) throw new Error("PAYMENT_PLAN_INVALID");
    if(Math.round(Number(payment.amountMxn)*100)!==Math.round(plan.monthlyMxn*100) ||
       Math.round(Number(payment.expectedAmountMxn)*100)!==Math.round(plan.monthlyMxn*100)){
      throw new Error("PAYMENT_AMOUNT_MISMATCH");
    }
    if(payment.currency !== "MXN" || payment.periodMonths !== 1) throw new Error("PAYMENT_TERMS_INVALID");

    payment.status=input.status;
    payment.note=input.note;
    payment.reviewedBy=session.sub;
    payment.reviewedAt=new Date();
    await payment.save({session:transaction});

    if(input.status==="approved"){
      const previous = await Subscription.findOne({ organizationId: payment.organizationId }).session(transaction);
      if(previous?.provider === "mercadopago" && previous.providerSubscriptionId && previous.status !== "cancelled") throw new Error("CANCEL_PROVIDER_SUBSCRIPTION_FIRST");
      const now = new Date();
      const periodStart = previous?.currentPeriodEnd && previous.currentPeriodEnd > now ? previous.currentPeriodEnd : now;
      await Subscription.findOneAndUpdate(
        {organizationId:payment.organizationId},
        {$set:{
          planCode:plan.code,
          status:"active",
          provider:"manual",
          vehicleLimit:plan.units,
          currentPeriodEnd:addCalendarMonth(periodStart)
        }},
        {session:transaction,upsert:true,new:true,setDefaultsOnInsert:true}
      );
      await Organization.updateOne({_id:payment.organizationId},{$set:{planCode:plan.code,status:"active"}}, {session:transaction});
    }

    await writeAudit({
      actorUserId:session.sub,
      organizationId:String(payment.organizationId),
      action:"manual_payment."+input.status,
      entityType:"ManualPayment",
      entityId:String(payment._id),
      metadata:{planCode:plan.code,amountMxn:payment.amountMxn,expectedAmountMxn:plan.monthlyMxn,currency:"MXN",periodMonths:1}
    }, transaction);
    return payment;
    });
    return NextResponse.json({payment});
  }catch(error){return apiError(error)}
}
