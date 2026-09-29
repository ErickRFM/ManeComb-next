import { NextResponse } from "next/server";
import { COMMERCIAL_PLANS } from "@/src/core/domain/commercial-plans";
export const runtime="nodejs";
export async function GET(){
  return NextResponse.json({plans:COMMERCIAL_PLANS});
}
