import { NextResponse } from "next/server";
import { requireApiSession } from "@/src/lib/auth";
import { connectDb } from "@/src/lib/db";
import { apiError } from "@/src/lib/http";
import { assertPlatformPermission } from "@/src/core/platform/permissions";
import { ManualPayment } from "@/src/core/models/ManualPayment";

export const runtime="nodejs";

export async function GET(request:Request){
  try{
    const session=await requireApiSession(request,["platform_admin"]);
    assertPlatformPermission(session,"platform.billing.read");
    await connectDb();
    const payments=await ManualPayment.find({status:"pending"}).select("-receiptUrl").sort({createdAt:1}).limit(500).lean();
    return NextResponse.json({payments});
  }catch(error){return apiError(error)}
}
