import { NextResponse } from "next/server";
import { connectDb } from "@/src/lib/db";
import { AppRelease } from "@/src/core/models/AppRelease";

export const runtime="nodejs";

export async function GET(){
  await connectDb();
  const release=await AppRelease.findOne({platform:"android"}).select("-updatedBy").lean();
  return NextResponse.json({
    release:release||null,
    timestamp:new Date().toISOString()
  },{
    headers:{"cache-control":"public, max-age=60, stale-while-revalidate=300"}
  });
}
