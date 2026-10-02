import { NextResponse } from "next/server";
import { requireApiSession } from "@/src/lib/auth";
import { connectDb } from "@/src/lib/db";
import { apiError } from "@/src/lib/http";
import { assertPlatformPermission } from "@/src/core/platform/permissions";
import { Organization } from "@/src/core/models/Organization";

export const runtime="nodejs";

export async function GET(request:Request){
  try{
    const session=await requireApiSession(request,["platform_admin"]);
    assertPlatformPermission(session,"platform.organizations.read");
    await connectDb();
    const organizations=await Organization.find({}).sort({createdAt:-1}).limit(500).lean();
    return NextResponse.json({organizations});
  }catch(error){return apiError(error)}
}
