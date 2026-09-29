import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiSession } from "@/src/lib/auth";
import { connectDb } from "@/src/lib/db";
import { apiError } from "@/src/lib/http";
import { Organization } from "@/src/core/models/Organization";
import { Subscription } from "@/src/core/models/Subscription";
import { writeAudit } from "@/src/core/services/audit";

const Patch=z.object({
  status:z.enum(["active","paused","suspended"]).optional(),
  planCode:z.string().min(1).max(50).optional()
}).refine(value=>Object.keys(value).length>0,{message:"At least one field is required"});

export const runtime="nodejs";

export async function PATCH(request:Request,{params}:{params:Promise<{organizationId:string}>}){
  try{
    const session=await requireApiSession(request,["platform_admin"]);
    const {organizationId}=await params;
    const patch=Patch.parse(await request.json());
    await connectDb();
    const organization=await Organization.findByIdAndUpdate(organizationId,{$set:patch},{new:true});
    if(!organization)return NextResponse.json({error:"Organization not found"},{status:404});

    if(patch.planCode){
      await Subscription.updateOne({organizationId},{$set:{planCode:patch.planCode}});
    }

    await writeAudit({
      actorUserId:session.sub,
      organizationId,
      action:"organization.update",
      entityType:"Organization",
      entityId:organizationId,
      metadata:patch
    });

    return NextResponse.json({organization});
  }catch(error){return apiError(error)}
}
