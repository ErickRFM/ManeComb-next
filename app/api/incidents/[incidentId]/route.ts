import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiSession } from "@/src/lib/auth";
import { connectDb } from "@/src/lib/db";
import { apiError } from "@/src/lib/http";
import { Incident } from "@/src/core/models/Incident";
import { writeAudit } from "@/src/core/services/audit";
import { emitToOrganization } from "@/src/realtime/runtime";

const Patch=z.object({status:z.enum(["acknowledged","resolved"])});
export const runtime="nodejs";

export async function PATCH(request:Request,{params}:{params:Promise<{incidentId:string}>}){
  try{
    const session=await requireApiSession(request,["company_portal"]);
    if(!session.organizationId) throw new Error("FORBIDDEN");
    const {incidentId}=await params;
    const {status}=Patch.parse(await request.json());
    await connectDb();
    const incident=await Incident.findOneAndUpdate(
      {_id:incidentId,organizationId:session.organizationId},
      {$set:{status,...(status==="resolved"?{resolvedAt:new Date()}:{})}},
      {new:true}
    );
    if(!incident) return NextResponse.json({error:"Incident not found"},{status:404});
    await writeAudit({organizationId:session.organizationId,actorUserId:session.sub,action:"incident."+status,entityType:"Incident",entityId:String(incident._id)});
    emitToOrganization(session.organizationId,"incident:update",incident.toObject());
    return NextResponse.json({incident});
  }catch(error){return apiError(error)}
}
