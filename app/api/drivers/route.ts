import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiSession } from "@/src/lib/auth";
import { connectDb } from "@/src/lib/db";
import { apiError } from "@/src/lib/http";
import { User } from "@/src/core/models/User";
import { writeAudit } from "@/src/core/services/audit";
import { assertAnyPermission, assertPermission } from "@/src/core/domain/permissions";

const CreateDriver=z.object({
  name:z.string().min(2).max(120),
  email:z.string().email(),
  pin:z.string().min(8).max(32)
});

export const runtime="nodejs";

export async function GET(request:Request){
  try{
    const session=await requireApiSession(request,["company_portal"]);
    if(!session.organizationId)throw new Error("FORBIDDEN");
    assertAnyPermission(session.roles,["manage_users","manage_vehicles","view_analytics"]);
    await connectDb();
    const drivers=await User.find({
      organizationId:session.organizationId,
      channel:"mobile_operations"
    }).select("_id name email active roles createdAt").sort({name:1}).lean();
    return NextResponse.json({drivers});
  }catch(error){return apiError(error)}
}

export async function POST(request:Request){
  try{
    const session=await requireApiSession(request,["company_portal"]);
    if(!session.organizationId)throw new Error("FORBIDDEN");
    assertPermission(session.roles,"manage_users");
    const input=CreateDriver.parse(await request.json());
    await connectDb();
    const driver=await User.create({
      organizationId:session.organizationId,
      name:input.name,
      email:input.email.toLowerCase(),
      passwordHash:await hash(input.pin,12),
      roles:["driver"],
      channel:"mobile_operations",
      active:true
    });
    await writeAudit({
      organizationId:session.organizationId,
      actorUserId:session.sub,
      action:"driver.create",
      entityType:"User",
      entityId:String(driver._id)
    });
    return NextResponse.json({driver:{id:String(driver._id),name:driver.name,email:driver.email,active:driver.active}},{status:201});
  }catch(error){return apiError(error)}
}
