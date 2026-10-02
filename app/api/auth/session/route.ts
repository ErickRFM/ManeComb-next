import { NextResponse } from "next/server";
import { requireApiSession } from "@/src/lib/auth";
import { apiError } from "@/src/lib/http";
import { connectDb } from "@/src/lib/db";
import { User } from "@/src/core/models/User";

export const runtime="nodejs";

type SessionUser={
  _id:unknown;
  name:string;
  email:string;
  roles:string[];
  platformRoles?:string[];
  channel:string;
};

export async function GET(request:Request){
  try{
    const session=await requireApiSession(request);
    await connectDb();
    const userDoc=await User.findOne({_id:session.sub}).select("_id name email roles platformRoles channel");
    if(!userDoc)throw new Error("UNAUTHORIZED");
    const user=userDoc as SessionUser;
    return NextResponse.json({
      user:{
        id:String(user._id),
        name:user.name,
        email:user.email,
        roles:user.roles,
        platformRoles:user.platformRoles||[],
        channel:user.channel,
        organizationId:session.organizationId
      }
    });
  }catch(error){return apiError(error)}
}
