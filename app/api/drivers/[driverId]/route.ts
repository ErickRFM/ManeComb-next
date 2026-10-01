import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiSession } from "@/src/lib/auth";
import { assertPermission } from "@/src/lib/authorization";
import { connectDb } from "@/src/lib/db";
import { apiError } from "@/src/lib/http";
import { User } from "@/src/core/models/User";
import { writeAudit } from "@/src/core/services/audit";
import { DeviceSession } from "@/src/core/models/DeviceSession";
import { Session } from "@/src/core/models/Session";
import { disconnectUserSessions } from "@/src/realtime/runtime";
import { enqueueAccountNotice } from "@/src/core/services/account-notifications";

const Patch=z.object({active:z.boolean().optional(),name:z.string().min(2).max(120).optional(),email:z.string().email().optional()}).refine(input=>Object.keys(input).length>0,{message:"At least one driver field is required"});
export const runtime="nodejs";

export async function PATCH(request:Request,{params}:{params:Promise<{driverId:string}>}){
  try{
    const session=assertPermission(await requireApiSession(request,["company_portal"]),"manage_users");
    if(!session.organizationId)throw new Error("FORBIDDEN");
    const {driverId}=await params;
    const input=Patch.parse(await request.json());
    await connectDb();

    const before=await User.findOne({_id:driverId,organizationId:session.organizationId,channel:"mobile_operations"}).select("_id name email active credentialVersion");
    if(!before)return NextResponse.json({error:"Driver not found"},{status:404});

    const nextEmail=input.email?.toLowerCase();
    const emailChanged=Boolean(nextEmail&&nextEmail!==before.email);
    const activeChanged=input.active!==undefined&&input.active!==before.active;
    const set:Record<string,unknown>={...input,...(nextEmail?{email:nextEmail}:{})};
    if(emailChanged)set.credentialVersion=Number(before.credentialVersion||0)+1;

    const driver=await User.findOneAndUpdate(
      {_id:driverId,organizationId:session.organizationId,channel:"mobile_operations"},
      {$set:set},
      {new:true,runValidators:true}
    ).select("_id name email active credentialVersion");
    if(!driver)return NextResponse.json({error:"Driver not found"},{status:404});

    if(input.active===false){
      await Promise.all([
        DeviceSession.updateMany({organizationId:session.organizationId,userId:driverId,revokedAt:null},{$set:{revokedAt:new Date()}}),
        Session.updateMany({userId:driverId,revokedAt:null},{$set:{revokedAt:new Date()}})
      ]);
      disconnectUserSessions(driverId);
    }

    if(emailChanged){
      await enqueueAccountNotice({
        to:driver.email,
        organizationId:session.organizationId,
        idempotencyKey:`email-changed:${driverId}:${driver.credentialVersion}`,
        subject:"El correo de tu cuenta ManeComb cambió",
        heading:"Correo actualizado",
        body:"El correo asociado a tu cuenta de conductor fue actualizado."
      }).catch(error=>console.error("[email:email-changed]",error));
    }

    if(activeChanged){
      await enqueueAccountNotice({
        to:driver.email,
        organizationId:session.organizationId,
        idempotencyKey:`account-${driver.active?"reactivated":"suspended"}:${driverId}:${driver.updatedAt.toISOString()}`,
        subject:driver.active?"Tu cuenta ManeComb fue reactivada":"Tu cuenta ManeComb fue suspendida",
        heading:driver.active?"Cuenta reactivada":"Cuenta suspendida",
        body:driver.active
          ?"Tu acceso como conductor fue reactivado por un administrador."
          :"Tu acceso como conductor fue suspendido por un administrador y las sesiones activas fueron cerradas."
      }).catch(error=>console.error("[email:driver-status]",error));
    }

    await writeAudit({organizationId:session.organizationId,actorUserId:session.sub,action:input.active===undefined?"driver.update":input.active?"driver.activate":"driver.deactivate",entityType:"User",entityId:driverId,metadata:{emailChanged,activeChanged}});
    return NextResponse.json({driver});
  }catch(error){return apiError(error)}
}
