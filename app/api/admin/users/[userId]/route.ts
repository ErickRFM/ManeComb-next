import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiSession } from "@/src/lib/auth";
import { connectDb } from "@/src/lib/db";
import { apiError } from "@/src/lib/http";
import {
  assertPlatformPermission,
  effectivePlatformRoles,
  PlatformRoleSchema
} from "@/src/core/platform/permissions";
import { User } from "@/src/core/models/User";
import { writeAudit } from "@/src/core/services/audit";

const Patch=z.object({
  active:z.boolean().optional(),
  role:PlatformRoleSchema.optional()
}).refine(value=>Object.keys(value).length>0,{message:"At least one field is required"});

export const runtime="nodejs";

export async function PATCH(request:Request,{params}:{params:Promise<{userId:string}>}){
  try{
    const session=await requireApiSession(request,["platform_admin"]);
    assertPlatformPermission(session,"platform.users.manage");
    const actorRoles=effectivePlatformRoles(session);
    const {userId}=await params;
    const input=Patch.parse(await request.json());
    await connectDb();

    const target=await User.findOne({_id:userId,channel:"platform_admin"});
    if(!target)return NextResponse.json({error:"Platform user not found"},{status:404});

    const targetRoles=effectivePlatformRoles({
      channel:target.channel,
      roles:(target.roles||[]).map(String),
      platformRoles:(target.platformRoles||[]).map(String)
    });
    const actorIsOwner=actorRoles.includes("platform_owner");
    const targetIsOwner=targetRoles.includes("platform_owner");

    if((targetIsOwner||input.role==="platform_owner")&&!actorIsOwner)throw new Error("FORBIDDEN");
    if(String(target._id)===session.sub&&input.active===false){
      return NextResponse.json({error:"CANNOT_SUSPEND_CURRENT_USER"},{status:409});
    }
    if(String(target._id)===session.sub&&input.role&&input.role!==targetRoles[0]){
      return NextResponse.json({error:"CANNOT_CHANGE_CURRENT_USER_ROLE"},{status:409});
    }

    if(targetIsOwner&&input.active===false){
      const activeOwners=await User.countDocuments({
        channel:"platform_admin",
        active:true,
        platformRoles:"platform_owner"
      });
      if(activeOwners<=1)return NextResponse.json({error:"LAST_PLATFORM_OWNER"},{status:409});
    }
    if(targetIsOwner&&input.role&&input.role!=="platform_owner"){
      const activeOwners=await User.countDocuments({
        channel:"platform_admin",
        active:true,
        platformRoles:"platform_owner"
      });
      if(activeOwners<=1)return NextResponse.json({error:"LAST_PLATFORM_OWNER"},{status:409});
    }

    const before={active:Boolean(target.active),platformRoles:[...(target.platformRoles||[])].map(String)};
    if(typeof input.active==="boolean")target.active=input.active;
    if(input.role)target.platformRoles=[input.role];
    await target.save();

    await writeAudit({
      actorUserId:session.sub,
      action:"platform.user.update",
      entityType:"User",
      entityId:String(target._id),
      metadata:{before,after:{active:Boolean(target.active),platformRoles:target.platformRoles}}
    });

    return NextResponse.json({user:{
      _id:target._id,
      name:target.name,
      email:target.email,
      platformRoles:target.platformRoles,
      active:target.active,
      mfaEnabled:target.mfaEnabled,
      updatedAt:target.updatedAt
    }});
  }catch(error){return apiError(error)}
}
