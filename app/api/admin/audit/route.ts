import { NextResponse } from "next/server";
import { requireApiSession } from "@/src/lib/auth";
import { connectDb } from "@/src/lib/db";
import { apiError } from "@/src/lib/http";
import { AuditLog } from "@/src/core/models/AuditLog";

export const runtime="nodejs";

export async function GET(request:Request){
  try{
    await requireApiSession(request,["platform_admin"]);
    await connectDb();
    const url=new URL(request.url);
    const limit=Math.min(500,Math.max(1,Number(url.searchParams.get("limit")||100)));
    const organizationId=url.searchParams.get("organizationId");
    const query=organizationId?{organizationId}:{};
    const events=await AuditLog.find(query).sort({occurredAt:-1}).limit(limit).lean();
    return NextResponse.json({events});
  }catch(error){return apiError(error)}
}
