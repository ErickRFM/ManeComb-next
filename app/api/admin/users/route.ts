import { hash } from "bcryptjs";
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

const Query=z.object({
  page:z.coerce.number().int().min(1).default(1),
  limit:z.coerce.number().int().min(1).max(100).default(30),
  search:z.string().trim().max(120).default("")
});
const Create=z.object({
  name:z.string().trim().min(2).max(120),
  email:z.string().email(),
  password:z.string().min(12).max(200),
  role:PlatformRoleSchema
});
const escapeRegex=(value:string)=>value.replace(/[\\^$.*+?()[\]{}|]/g,"\\$&");

export const runtime="nodejs";

export async function GET(request:Request){
  try{
    const session=await requireApiSession(request,["platform_admin"]);
    assertPlatformPermission(session,"platform.users.read");
    const url=new URL(request.url);
    const query=Query.parse({
      page:url.searchParams.get("page")||undefined,
      limit:url.searchParams.get("limit")||undefined,
      search:url.searchParams.get("search")||""
    });
    await connectDb();
    const filter:any={channel:"platform_admin"};
    if(query.search){
      const pattern=new RegExp(escapeRegex(query.search),"i");
      filter.$or=[{name:pattern},{email:pattern},{platformRoles:pattern}];
    }
    const [users,total]=await Promise.all([
      User.find(filter)
        .select("_id name email platformRoles active mfaEnabled createdAt updatedAt")
        .sort({name:1,_id:1})
        .skip((query.page-1)*query.limit)
        .limit(query.limit)
        .lean(),
      User.countDocuments(filter)
    ]);
    return NextResponse.json({
      users,
      pageInfo:{
        page:query.page,
        limit:query.limit,
        total,
        totalPages:Math.max(1,Math.ceil(total/query.limit)),
        hasPrev:query.page>1,
        hasNext:query.page*query.limit<total
      }
    });
  }catch(error){return apiError(error)}
}

export async function POST(request:Request){
  try{
    const session=await requireApiSession(request,["platform_admin"]);
    assertPlatformPermission(session,"platform.users.manage");
    const actorRoles=effectivePlatformRoles(session);
    const input=Create.parse(await request.json());
    if(input.role==="platform_owner"&&!actorRoles.includes("platform_owner"))throw new Error("FORBIDDEN");
    await connectDb();
    const email=input.email.trim().toLowerCase();
    if(await User.exists({email}))return NextResponse.json({error:"USER_EMAIL_EXISTS"},{status:409});
    const user=await User.create({
      organizationId:null,
      email,
      passwordHash:await hash(input.password,12),
      name:input.name,
      roles:[],
      platformRoles:[input.role],
      channel:"platform_admin",
      active:true,
      mfaEnabled:false
    });
    await writeAudit({
      actorUserId:session.sub,
      action:"platform.user.create",
      entityType:"User",
      entityId:String(user._id),
      metadata:{email:user.email,platformRoles:user.platformRoles}
    });
    return NextResponse.json({user:{
      _id:user._id,
      name:user.name,
      email:user.email,
      platformRoles:user.platformRoles,
      active:user.active,
      mfaEnabled:user.mfaEnabled,
      createdAt:user.createdAt
    }},{status:201});
  }catch(error){return apiError(error)}
}
