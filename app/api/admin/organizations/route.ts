import { NextResponse } from "next/server";
import { requireApiSession } from "@/src/lib/auth";
import { connectDb } from "@/src/lib/db";
import { apiError } from "@/src/lib/http";
import { Organization } from "@/src/core/models/Organization";
export const runtime="nodejs";
export async function GET(request:Request){
  try{await requireApiSession(request,["platform_admin"]);await connectDb();const organizations=await Organization.find({}).sort({createdAt:-1}).limit(500).lean();return NextResponse.json({organizations})}
  catch(error){return apiError(error)}
}
