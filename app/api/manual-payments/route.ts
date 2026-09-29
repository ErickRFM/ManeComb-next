import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiSession } from "@/src/lib/auth";
import { connectDb } from "@/src/lib/db";
import { apiError } from "@/src/lib/http";
import { ManualPayment } from "@/src/core/models/ManualPayment";
const Input=z.object({amountMxn:z.number().positive(),receiptUrl:z.string().url()});
export const runtime="nodejs";
export async function GET(request:Request){
  try{const session=await requireApiSession(request,["company_portal"]);await connectDb();const payments=await ManualPayment.find({organizationId:session.organizationId}).sort({createdAt:-1}).lean();return NextResponse.json({payments})}
  catch(error){return apiError(error)}
}
export async function POST(request:Request){
  try{const session=await requireApiSession(request,["company_portal"]);if(!session.organizationId)throw new Error("FORBIDDEN");const input=Input.parse(await request.json());await connectDb();const payment=await ManualPayment.create({organizationId:session.organizationId,...input});return NextResponse.json({payment},{status:201})}
  catch(error){return apiError(error)}
}
