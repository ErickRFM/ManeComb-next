import { NextResponse } from "next/server";
import { requireApiSession } from "@/src/lib/auth";
import { apiError } from "@/src/lib/http";
import { connectDb } from "@/src/lib/db";
import { hasPermission } from "@/src/core/domain/permissions";
import { User } from "@/src/core/models/User";

export const runtime="nodejs";

export async function GET(request:Request){
  try{
    const session=await requireApiSession(request,["company_portal","mobile_operations"]);
    if(!session.organizationId||!hasPermission(session.roles,"access_chat"))throw new Error("FORBIDDEN");
    await connectDb();
    const rows=await User.find({
      organizationId:session.organizationId,
      active:true,
      _id:{$ne:session.sub}
    }).select("_id name channel roles").sort({name:1}).lean();

    const users=rows.filter((row:any)=>hasPermission(row.roles||[],"access_chat")).map((row:any)=>({
      id:String(row._id),
      name:row.name,
      channel:row.channel,
      roles:row.roles
    }));
    return NextResponse.json({users});
  }catch(error){return apiError(error)}
}
