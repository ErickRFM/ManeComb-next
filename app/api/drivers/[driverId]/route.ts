import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiSession } from "@/src/lib/auth";
import { connectDb } from "@/src/lib/db";
import { apiError } from "@/src/lib/http";
import { User } from "@/src/core/models/User";
import { writeAudit } from "@/src/core/services/audit";

const Patch=z.object({active:z.boolean()});
export const runtime="nodejs";

export async function PATCH(request:Request,{params}:{params:Promise<{driverId:string}>}){
  try{
    const session=await requireApiSession(request,["company_portal"]);
    if(!session.organizationId)throw new Error("FORBIDDEN");
    const {driverId}=await params;
    const input=Patch.parse(await request.json());
    await connectDb();
    const driver=await User.findOneAndUpdate(
      {_id:driverId,organizationId:session.organizationId,channel:"mobile_operations"},
      {$set:{active:input.active}},
      {new:true}
    ).select("_id name email active");
    if(!driver)return NextResponse.json({error:"Driver not found"},{status:404});
    await writeAudit({organizationId:session.organizationId,actorUserId:session.sub,action:input.active?"driver.activate":"driver.deactivate",entityType:"User",entityId:driverId});
    return NextResponse.json({driver});
  }catch(error){return apiError(error)}
}
