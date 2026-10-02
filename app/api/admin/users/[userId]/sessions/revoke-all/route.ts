import { NextResponse } from "next/server";
import { requireApiSession } from "@/src/lib/auth";
import { connectDb } from "@/src/lib/db";
import { apiError } from "@/src/lib/http";
import { assertPlatformPermission } from "@/src/core/platform/permissions";
import { Session } from "@/src/core/models/Session";
import { User } from "@/src/core/models/User";
import { writeAudit } from "@/src/core/services/audit";

export const runtime="nodejs";

export async function POST(request:Request,{params}:{params:Promise<{userId:string}>}){
  try{
    const auth=await requireApiSession(request,["platform_admin"]);
    assertPlatformPermission(auth,"platform.sessions.revoke");
    const {userId}=await params;
    await connectDb();
    const user=await User.findOne({_id:userId,channel:"platform_admin"}).select("_id");
    if(!user)return NextResponse.json({error:"Platform user not found"},{status:404});
    const result=await Session.updateMany(
      {userId:user._id,revokedAt:null,expiresAt:{$gt:new Date()}},
      {$set:{revokedAt:new Date()}}
    );
    await writeAudit({
      actorUserId:auth.sub,
      action:"platform.sessions.revoke_all",
      entityType:"User",
      entityId:String(user._id),
      metadata:{revokedCount:result.modifiedCount}
    });
    return NextResponse.json({ok:true,revokedCount:result.modifiedCount});
  }catch(error){return apiError(error)}
}
