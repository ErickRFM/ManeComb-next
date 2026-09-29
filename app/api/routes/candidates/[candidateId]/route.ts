import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiSession } from "@/src/lib/auth";
import { connectDb } from "@/src/lib/db";
import { apiError } from "@/src/lib/http";
import { reviewRouteCandidate } from "@/src/core/services/route-learning";

export const runtime="nodejs";

export async function PATCH(request:Request,{params}:{params:Promise<{candidateId:string}>}){
  try{
    const session=await requireApiSession(request,["company_portal"]);
    if(!session.organizationId)throw new Error("FORBIDDEN");
    const {candidateId}=await params;
    const {action}=z.object({action:z.enum(["approved","rejected"])}).parse(await request.json());
    await connectDb();
    const candidate=await reviewRouteCandidate({
      organizationId:session.organizationId,
      candidateId,
      actorUserId:session.sub,
      action
    });
    return NextResponse.json({candidate});
  }catch(error){return apiError(error)}
}
