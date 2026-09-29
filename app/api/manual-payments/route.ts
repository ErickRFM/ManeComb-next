import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiSession } from "@/src/lib/auth";
import { assertPermission } from "@/src/lib/authorization";
import { connectDb } from "@/src/lib/db";
import { apiError } from "@/src/lib/http";
import { getCommercialPlan } from "@/src/core/domain/commercial-plans";
import { ManualPayment } from "@/src/core/models/ManualPayment";

const Input=z.object({
  planCode:z.string().min(1),
  amountMxn:z.number().positive(),
  receiptUrl:z.string().url(),
  idempotencyKey:z.string().min(8).max(200).optional()
});
export const runtime="nodejs";

export async function GET(request:Request){
  try{
    const session=assertPermission(await requireApiSession(request,["company_portal"]),"manage_billing");
    await connectDb();
    const payments=await ManualPayment.find({organizationId:session.organizationId}).sort({createdAt:-1}).lean();
    return NextResponse.json({payments});
  }catch(error){return apiError(error)}
}

export async function POST(request:Request){
  try{
    const session=assertPermission(await requireApiSession(request,["company_portal"]),"manage_billing");
    if(!session.organizationId)throw new Error("FORBIDDEN");
    const input=Input.parse(await request.json());
    const plan=getCommercialPlan(input.planCode);
    if(!plan)return NextResponse.json({error:"Unknown plan"},{status:404});
    if(Math.round(input.amountMxn*100)!==Math.round(plan.monthlyMxn*100)){
      return NextResponse.json({error:"PAYMENT_AMOUNT_MISMATCH",expectedAmountMxn:plan.monthlyMxn},{status:422});
    }

    await connectDb();
    const key=input.idempotencyKey||randomUUID();
    const payment=await ManualPayment.findOneAndUpdate(
      {organizationId:session.organizationId,idempotencyKey:key},
      {$setOnInsert:{
        organizationId:session.organizationId,
        planCode:plan.code,
        amountMxn:input.amountMxn,
        expectedAmountMxn:plan.monthlyMxn,
        currency:"MXN",
        periodMonths:1,
        receiptUrl:input.receiptUrl,
        idempotencyKey:key
      }},
      {upsert:true,new:true}
    );
    return NextResponse.json({payment},{status:201});
  }catch(error){return apiError(error)}
}
