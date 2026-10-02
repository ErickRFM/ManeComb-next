import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { z } from "zod";
import { requireApiSession } from "@/src/lib/auth";
import { connectDb } from "@/src/lib/db";
import { apiError } from "@/src/lib/http";
import { assertPlatformPermission } from "@/src/core/platform/permissions";
import { Organization } from "@/src/core/models/Organization";
import { Subscription } from "@/src/core/models/Subscription";
import { User } from "@/src/core/models/User";
import { Vehicle } from "@/src/core/models/Vehicle";
import { Journey } from "@/src/core/models/Journey";
import { Incident } from "@/src/core/models/Incident";
import { ManualPayment } from "@/src/core/models/ManualPayment";
import { AuditLog } from "@/src/core/models/AuditLog";
import { getCommercialPlan } from "@/src/core/domain/commercial-plans";
import { writeAudit } from "@/src/core/services/audit";
import { enqueueAccountNotice } from "@/src/core/services/account-notifications";

const Patch=z.object({
  status:z.enum(["active","paused","suspended"]).optional(),
  planCode:z.string().min(1).max(50).optional()
}).refine(value=>Object.keys(value).length>0,{message:"At least one field is required"});
export const runtime="nodejs";

export async function GET(request:Request,{params}:{params:Promise<{organizationId:string}>}){
  try{
    const session=await requireApiSession(request,["platform_admin"]);
    assertPlatformPermission(session,"platform.organizations.read");
    const {organizationId}=await params;
    await connectDb();

    const organization=await Organization.findById(organizationId).lean();
    if(!organization)return NextResponse.json({error:"Organization not found"},{status:404});

    const [subscription,owner,userCounts,vehicleCounts,journeyCounts,openIncidents,recentPayments,recentAudit]=await Promise.all([
      Subscription.findOne({organizationId}).lean(),
      User.findOne({organizationId,channel:"company_portal",roles:"owner",active:true}).select("_id name email").lean(),
      User.aggregate([
        {$match:{organizationId:new mongoose.Types.ObjectId(organizationId)}},
        {$group:{_id:"$active",count:{$sum:1}}}
      ]),
      Vehicle.aggregate([
        {$match:{organizationId:new mongoose.Types.ObjectId(organizationId)}},
        {$group:{_id:"$status",count:{$sum:1}}}
      ]),
      Journey.aggregate([
        {$match:{organizationId:new mongoose.Types.ObjectId(organizationId)}},
        {$group:{_id:"$state",count:{$sum:1}}}
      ]),
      Incident.countDocuments({organizationId,status:{$in:["open","acknowledged"]}}),
      ManualPayment.find({organizationId})
        .select("planCode amountMxn currency status reviewedAt note createdAt")
        .sort({createdAt:-1})
        .limit(10)
        .lean(),
      AuditLog.find({organizationId})
        .select("action category entityType entityId actorUserId occurredAt")
        .sort({occurredAt:-1})
        .limit(20)
        .lean()
    ]);

    const counts=(rows:any[])=>Object.fromEntries(rows.map(row=>[String(row._id),row.count]));
    const users=counts(userCounts),vehicles=counts(vehicleCounts),journeys=counts(journeyCounts);

    return NextResponse.json({
      organization,
      owner,
      subscription,
      summary:{
        users:{total:Object.values(users).reduce((sum:any,value:any)=>sum+Number(value),0),active:users.true||0,inactive:users.false||0},
        vehicles:{total:Object.values(vehicles).reduce((sum:any,value:any)=>sum+Number(value),0),byStatus:vehicles},
        journeys:{total:Object.values(journeys).reduce((sum:any,value:any)=>sum+Number(value),0),byState:journeys},
        openIncidents
      },
      recentPayments,
      recentAudit
    });
  }catch(error){return apiError(error)}
}

export async function PATCH(request:Request,{params}:{params:Promise<{organizationId:string}>}){
  try{
    const session=await requireApiSession(request,["platform_admin"]);
    assertPlatformPermission(session,"platform.organizations.write");
    const {organizationId}=await params;
    const patch=Patch.parse(await request.json());
    const plan=patch.planCode?getCommercialPlan(patch.planCode):null;
    if(patch.planCode&&!plan)return NextResponse.json({error:"Unknown plan"},{status:422});

    await connectDb();
    const result=await mongoose.connection.transaction(async transaction=>{
      const before=await Organization.findById(organizationId).select("status planCode").session(transaction);
      if(!before)throw new Error("ORGANIZATION_NOT_FOUND");

      const organization=await Organization.findByIdAndUpdate(
        organizationId,
        {$set:patch},
        {new:true,runValidators:true,session:transaction}
      );
      if(!organization)throw new Error("ORGANIZATION_NOT_FOUND");

      if(plan){
        const subscription=await Subscription.findOneAndUpdate(
          {organizationId},
          {$set:{planCode:plan.code,vehicleLimit:plan.units}},
          {new:true,runValidators:true,session:transaction}
        );
        if(!subscription)throw new Error("SUBSCRIPTION_NOT_FOUND");
      }

      await writeAudit({
        actorUserId:session.sub,
        organizationId,
        action:"organization.update",
        entityType:"Organization",
        entityId:organizationId,
        metadata:patch
      },transaction);

      return {organization,beforeStatus:String(before.status)};
    });

    if(patch.status&&patch.status!==result.beforeStatus&&(patch.status==="suspended"||patch.status==="active")){
      const owners=await User.find({organizationId,channel:"company_portal",roles:"owner"}).select("_id email").lean();
      const suspended=patch.status==="suspended";
      await Promise.all(owners.map(owner=>enqueueAccountNotice({
        to:owner.email,
        organizationId,
        idempotencyKey:`organization-${suspended?"suspended":"reactivated"}:${organizationId}:${result.organization.updatedAt.toISOString()}:${String(owner._id)}`,
        subject:suspended?"Tu empresa ManeComb fue suspendida":"Tu empresa ManeComb fue reactivada",
        heading:suspended?"Cuenta suspendida":"Cuenta reactivada",
        body:suspended
          ?"El acceso operativo de tu empresa fue suspendido por administración."
          :"El acceso operativo de tu empresa fue reactivado por administración."
      }).catch(error=>console.error("[email:organization-status]",error))));
    }

    return NextResponse.json({organization:result.organization});
  }catch(error){
    if(error instanceof Error&&error.message==="ORGANIZATION_NOT_FOUND"){
      return NextResponse.json({error:"Organization not found"},{status:404});
    }
    if(error instanceof Error&&error.message==="SUBSCRIPTION_NOT_FOUND"){
      return NextResponse.json({error:"Subscription not found; plan change was rolled back"},{status:409});
    }
    return apiError(error);
  }
}
