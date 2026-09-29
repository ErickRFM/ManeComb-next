import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiSession } from "@/src/lib/auth";
import { connectDb } from "@/src/lib/db";
import { apiError } from "@/src/lib/http";
import { AppRelease } from "@/src/core/models/AppRelease";
import { writeAudit } from "@/src/core/services/audit";

const Version=z.string().regex(/^\d+\.\d+\.\d+(?:[-+][A-Za-z0-9.-]+)?$/);
const Input=z.object({
  latestVersion:Version,
  minimumVersion:Version,
  latestVersionCode:z.number().int().min(1),
  minimumVersionCode:z.number().int().min(1),
  downloadUrl:z.string().url(),
  notes:z.string().max(5000).default(""),
  forceUpdate:z.boolean().default(false)
}).refine(value=>value.minimumVersionCode<=value.latestVersionCode,{
  message:"minimumVersionCode cannot exceed latestVersionCode"
});
export const runtime="nodejs";

export async function GET(request:Request){
  try{
    await requireApiSession(request,["platform_admin"]);
    await connectDb();
    const release=await AppRelease.findOne({platform:"android"}).lean();
    return NextResponse.json({release});
  }catch(error){return apiError(error)}
}

export async function PUT(request:Request){
  try{
    const session=await requireApiSession(request,["platform_admin"]);
    const input=Input.parse(await request.json());
    await connectDb();
    const release=await AppRelease.findOneAndUpdate(
      {platform:"android"},
      {$set:{...input,publishedAt:new Date(),updatedBy:session.sub}},
      {upsert:true,new:true,runValidators:true}
    );
    await writeAudit({
      actorUserId:session.sub,
      action:"app_release.android.update",
      entityType:"AppRelease",
      entityId:String(release._id),
      metadata:{
        latestVersion:input.latestVersion,
        minimumVersion:input.minimumVersion,
        latestVersionCode:input.latestVersionCode,
        minimumVersionCode:input.minimumVersionCode,
        forceUpdate:input.forceUpdate
      }
    });
    return NextResponse.json({release});
  }catch(error){return apiError(error)}
}
