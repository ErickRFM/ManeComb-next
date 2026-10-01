import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiSession } from "@/src/lib/auth";
import { connectDb } from "@/src/lib/db";
import { apiError } from "@/src/lib/http";
import { Organization } from "@/src/core/models/Organization";
import { Subscription } from "@/src/core/models/Subscription";
import { User } from "@/src/core/models/User";
import { getCommercialPlan } from "@/src/core/domain/commercial-plans";
import { writeAudit } from "@/src/core/services/audit";
import { enqueueAccountNotice } from "@/src/core/services/account-notifications";

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
    const plan=patch.planCode?getCommercialPlan(patch.planCode):null;
    if(patch.planCode&&!plan)return NextResponse.json({error:"Unknown plan"},{status:422});

    await connectDb();
    const before=await Organization.findById(organizationId).select("status");
    if(!before)return NextResponse.json({error:"Organization not found"},{status:404});
    const organization=await Organization.findByIdAndUpdate(organizationId,{$set:patch},{new:true,runValidators:true});
    if(plan){
      await Subscription.findOneAndUpdate(
        {organizationId},
        {$set:{planCode:plan.code,vehicleLimit:plan.units}},
        {upsert:false}
      );
    }
    await writeAudit({actorUserId:session.sub,organizationId,action:"organization.update",entityType:"Organization",entityId:organizationId,metadata:patch});

    if(patch.status&&patch.status!==before.status&&(patch.status==="suspended"||patch.status==="active")){
      const owners=await User.find({organizationId,channel:"company_portal",roles:"owner"}).select("_id email").lean();
      const suspended=patch.status==="suspended";
      await Promise.all(owners.map(owner=>enqueueAccountNotice({
        to:owner.email,
        organizationId,
        idempotencyKey:`organization-${suspended?"suspended":"reactivated"}:${organizationId}:${organization.updatedAt.toISOString()}:${String(owner._id)}`,
        subject:suspended?"Tu empresa ManeComb fue suspendida":"Tu empresa ManeComb fue reactivada",
        heading:suspended?"Cuenta suspendida":"Cuenta reactivada",
        body:suspended
          ?"El acceso operativo de tu empresa fue suspendido por administración."
          :"El acceso operativo de tu empresa fue reactivado por administración."
      }).catch(error=>console.error("[email:organization-status]",error))));
    }

    return NextResponse.json({organization});
  }catch(error){return apiError(error)}
}
