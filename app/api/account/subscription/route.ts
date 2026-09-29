import { NextResponse } from "next/server";
import { requireApiSession } from "@/src/lib/auth";
import { connectDb } from "@/src/lib/db";
import { apiError } from "@/src/lib/http";
import { Subscription } from "@/src/core/models/Subscription";
import { assertPermission } from "@/src/core/domain/permissions";

export const runtime="nodejs";

export async function GET(request:Request){
  try{
    const session=await requireApiSession(request,["company_portal"]);
    if(!session.organizationId)throw new Error("FORBIDDEN");
    assertPermission(session.roles,"manage_billing");
    await connectDb();
    const subscription=await Subscription.findOne({organizationId:session.organizationId}).lean();
    return NextResponse.json({subscription});
  }catch(error){return apiError(error)}
}
