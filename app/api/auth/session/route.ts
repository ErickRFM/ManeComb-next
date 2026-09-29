import { NextResponse } from "next/server";
import { requireApiSession } from "@/src/lib/auth";
import { apiError } from "@/src/lib/http";
import { connectDb } from "@/src/lib/db";
import { User } from "@/src/core/models/User";

export const runtime="nodejs";

export async function GET(request:Request){
  try{
    const session=await requireApiSession(request);
    await connectDb();
    const user=await User.findById(session.sub).select("_id name email roles channel");
    if(!user)throw new Error("UNAUTHORIZED");
    return NextResponse.json({
      user:{
        id:String(user._id),
        name:user.name,
        email:user.email,
        roles:user.roles,
        channel:user.channel,
        organizationId:session.organizationId
      }
    });
  }catch(error){return apiError(error)}
}
