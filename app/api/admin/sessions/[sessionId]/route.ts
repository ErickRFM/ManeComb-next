import { NextResponse } from "next/server";
import { requireApiSession } from "@/src/lib/auth";
import { connectDb } from "@/src/lib/db";
import { apiError } from "@/src/lib/http";
import { assertPlatformPermission } from "@/src/core/platform/permissions";
import { Session } from "@/src/core/models/Session";
import { User } from "@/src/core/models/User";
import { writeAudit } from "@/src/core/services/audit";

export const runtime="nodejs";

export async function DELETE(request:Request,{params}:{params:Promise<{sessionId:string}>}){
  try{
    const auth=await requireApiSession(request,["platform_admin"]);
    assertPlatformPermission(auth,"platform.sessions.revoke");
    const {sessionId}=await params;
    await connectDb();
    const target=await Session.findById(sessionId);
    if(!target)return NextResponse.json({error:"Session not found"},{status:404});
    const user=await User.findOne({_id:target.userId,channel:"platform_admin"}).select("_id");
    if(!user)return NextResponse.json({error:"Session not found"},{status:404});
    if(target.revokedAt)return NextResponse.json({ok:true});
    target.revokedAt=new Date();
    await target.save();
    await writeAudit({
      actorUserId:auth.sub,
      action:"platform.session.revoke",
      entityType:"Session",
      entityId:String(target._id),
      metadata:{targetUserId:String(target.userId),current:String(target.jti)===auth.jti}
    });
    return NextResponse.json({ok:true});
  }catch(error){return apiError(error)}
}
