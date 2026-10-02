import { NextResponse } from "next/server";
import { requireApiSession } from "@/src/lib/auth";
import { connectDb } from "@/src/lib/db";
import { apiError } from "@/src/lib/http";
import { assertPlatformPermission } from "@/src/core/platform/permissions";
import { Session } from "@/src/core/models/Session";
import { User } from "@/src/core/models/User";

export const runtime="nodejs";

export async function GET(request:Request){
  try{
    const auth=await requireApiSession(request,["platform_admin"]);
    assertPlatformPermission(auth,"platform.sessions.read");
    await connectDb();
    const platformUsers=await User.find({channel:"platform_admin"}).select("_id name email platformRoles active").lean();
    const userMap=new Map(platformUsers.map(user=>[String(user._id),user]));
    const sessions=await Session.find({
      userId:{$in:platformUsers.map(user=>user._id)},
      expiresAt:{$gt:new Date()}
    }).sort({createdAt:-1}).limit(300).lean();
    return NextResponse.json({
      sessions:sessions.map(row=>({
        _id:row._id,
        user:userMap.get(String(row.userId))||null,
        createdAt:row.createdAt,
        expiresAt:row.expiresAt,
        revokedAt:row.revokedAt,
        current:String(row.userId)===auth.sub&&row.jti===auth.jti
      }))
    });
  }catch(error){return apiError(error)}
}
