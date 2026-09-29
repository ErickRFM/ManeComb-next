import { NextResponse } from "next/server";
import { getSystemHealth } from "@/src/core/services/health";
export const runtime="nodejs";
export async function GET(){
  const health=await getSystemHealth();
  return NextResponse.json(health,{status:health.status==="ok"?200:503});
}
