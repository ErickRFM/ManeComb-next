import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiSession } from "@/src/lib/auth";
import { connectDb } from "@/src/lib/db";
import { apiError } from "@/src/lib/http";
import { Route } from "@/src/core/models/Route";
import { writeAudit } from "@/src/core/services/audit";
import { assertAnyPermission, assertPermission } from "@/src/core/domain/permissions";

const Point = z.object({ latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180) });
const Stop = Point.extend({ name: z.string().min(1), order: z.number().int().min(0), radiusM: z.number().min(10).max(1000).default(50) });
const RoutePatch = z.object({
  name: z.string().min(1).max(120).optional(),
  origin: z.string().max(120).optional(),
  destination: z.string().max(120).optional(),
  geometry: z.array(Point).min(2).optional(),
  stops: z.array(Stop).optional(),
  distanceKm: z.number().min(0).optional(),
  status: z.enum(["draft","active","archived"]).optional()
}).refine((value)=>Object.keys(value).length>0,{message:"At least one field is required"});

export const runtime="nodejs";

export async function GET(request:Request,{params}:{params:Promise<{routeId:string}>}){
  try{
    const session=await requireApiSession(request,["company_portal"]);
    if(!session.organizationId) throw new Error("FORBIDDEN");
    assertAnyPermission(session.roles,["manage_routes","view_analytics"]);
    const {routeId}=await params;
    await connectDb();
    const route=await Route.findOne({_id:routeId,organizationId:session.organizationId}).lean();
    if(!route) return NextResponse.json({error:"Route not found"},{status:404});
    return NextResponse.json({route});
  }catch(error){return apiError(error)}
}

export async function PATCH(request:Request,{params}:{params:Promise<{routeId:string}>}){
  try{
    const session=await requireApiSession(request,["company_portal"]);
    if(!session.organizationId) throw new Error("FORBIDDEN");
    assertPermission(session.roles,"manage_routes");
    const {routeId}=await params;
    const patch=RoutePatch.parse(await request.json());
    await connectDb();
    const current=await Route.findOne({_id:routeId,organizationId:session.organizationId});
    if(!current) return NextResponse.json({error:"Route not found"},{status:404});

    const previousRevision=current.revision || 1;
    Object.assign(current,patch);
    current.revision=previousRevision+1;
    await current.save();

    await writeAudit({
      organizationId:session.organizationId,
      actorUserId:session.sub,
      action:"route.update",
      entityType:"Route",
      entityId:String(current._id),
      metadata:{revision:current.revision,fields:Object.keys(patch)}
    });

    return NextResponse.json({route:current});
  }catch(error){return apiError(error)}
}
