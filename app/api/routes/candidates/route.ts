import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiSession } from "@/src/lib/auth";
import { connectDb } from "@/src/lib/db";
import { apiError } from "@/src/lib/http";
import { LearnedRouteCandidate } from "@/src/core/models/LearnedRouteCandidate";
import { generateRouteCandidate } from "@/src/core/services/route-learning";

export const runtime="nodejs";

export async function GET(request:Request){
  try{
    const session=await requireApiSession(request,["company_portal"]);
    if(!session.organizationId)throw new Error("FORBIDDEN");
    await connectDb();
    const candidates=await LearnedRouteCandidate.find({organizationId:session.organizationId}).sort({createdAt:-1}).limit(100).lean();
    return NextResponse.json({candidates});
  }catch(error){return apiError(error)}
}

export async function POST(request:Request){
  try{
    const session=await requireApiSession(request,["company_portal"]);
    if(!session.organizationId)throw new Error("FORBIDDEN");
    const {routeId}=z.object({routeId:z.string().min(1)}).parse(await request.json());
    await connectDb();
    const candidate=await generateRouteCandidate(session.organizationId,routeId);
    return NextResponse.json({candidate},{status:201});
  }catch(error){return apiError(error)}
}
