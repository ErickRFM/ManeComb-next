import { NextResponse } from "next/server";
import { requireApiSession } from "@/src/lib/auth";
import { assertPermission } from "@/src/lib/authorization";
import { apiError } from "@/src/lib/http";
import { getRtcIceConfig } from "@/src/lib/rtc-config";

export const runtime="nodejs";

export async function GET(request:Request){
  try{
    const session=await requireApiSession(request,["company_portal","mobile_operations"]);
    assertPermission(session,"access_rtc");
    return NextResponse.json(getRtcIceConfig(session.sub));
  }catch(error){return apiError(error)}
}
