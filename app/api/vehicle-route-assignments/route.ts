import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiSession } from "@/src/lib/auth";
import { assertPermission } from "@/src/lib/authorization";
import { connectDb } from "@/src/lib/db";
import { apiError } from "@/src/lib/http";
import { VehicleRouteAssignment } from "@/src/core/models/VehicleRouteAssignment";
import { activateVehicleRouteAssignment,upsertVehicleRouteAssignment } from "@/src/core/services/route-assignments";
import { writeAudit } from "@/src/core/services/audit";

const Create=z.object({
  vehicleId:z.string().min(1),
  routeId:z.string().min(1),
  status:z.enum(["AVAILABLE","SCHEDULED"]).default("AVAILABLE"),
  priority:z.number().int().min(0).max(10_000).optional(),
  selectableByDriver:z.boolean().optional(),
  scheduledFrom:z.coerce.date().nullable().optional(),
  scheduledUntil:z.coerce.date().nullable().optional()
});
const Patch=z.object({
  assignmentId:z.string().min(1),
  action:z.enum(["activate","cancel"])
});
export const runtime="nodejs";

export async function GET(request:Request){
  try{
    const session=assertPermission(await requireApiSession(request,["company_portal"]),"view_analytics");
    if(!session.organizationId)throw new Error("FORBIDDEN");
    await connectDb();
    const url=new URL(request.url);
    const vehicleId=url.searchParams.get("vehicleId");
    const query:any={organizationId:session.organizationId};
    if(vehicleId)query.vehicleId=vehicleId;
    const assignments=await VehicleRouteAssignment.find(query)
      .populate("routeId","name revision status")
      .sort({vehicleId:1,status:1,priority:1,updatedAt:-1})
      .limit(500)
      .lean();
    return NextResponse.json({assignments});
  }catch(error){return apiError(error)}
}

export async function POST(request:Request){
  try{
    const session=assertPermission(await requireApiSession(request,["company_portal"]),"manage_routes");
    if(!session.organizationId)throw new Error("FORBIDDEN");
    const input=Create.parse(await request.json());
    await connectDb();
    const assignment=await upsertVehicleRouteAssignment({
      organizationId:session.organizationId,
      vehicleId:input.vehicleId,
      routeId:input.routeId,
      actorUserId:session.sub,
      status:input.status,
      priority:input.priority,
      selectableByDriver:input.selectableByDriver,
      scheduledFrom:input.scheduledFrom,
      scheduledUntil:input.scheduledUntil
    });
    await writeAudit({
      organizationId:session.organizationId,
      actorUserId:session.sub,
      action:"vehicle_route_assignment.upsert",
      entityType:"VehicleRouteAssignment",
      entityId:String(assignment._id),
      metadata:{vehicleId:input.vehicleId,routeId:input.routeId,status:input.status}
    });
    return NextResponse.json({assignment},{status:201});
  }catch(error){return apiError(error)}
}

export async function PATCH(request:Request){
  try{
    const session=assertPermission(await requireApiSession(request,["company_portal"]),"manage_routes");
    if(!session.organizationId)throw new Error("FORBIDDEN");
    const input=Patch.parse(await request.json());
    await connectDb();
    const current=await VehicleRouteAssignment.findOne({_id:input.assignmentId,organizationId:session.organizationId});
    if(!current)return NextResponse.json({error:"Route assignment not found"},{status:404});

    if(input.action==="activate"){
      const assignment=await activateVehicleRouteAssignment({
        organizationId:session.organizationId,
        vehicleId:String(current.vehicleId),
        routeId:String(current.routeId),
        actorUserId:session.sub
      });
      await writeAudit({
        organizationId:session.organizationId,
        actorUserId:session.sub,
        action:"vehicle_route_assignment.activate",
        entityType:"VehicleRouteAssignment",
        entityId:String(assignment._id),
        metadata:{vehicleId:String(current.vehicleId),routeId:String(current.routeId)}
      });
      return NextResponse.json({assignment});
    }

    if(current.status==="ACTIVE"){
      return NextResponse.json({error:"ACTIVE_ASSIGNMENT_MUST_BE_REPLACED"},{status:409});
    }
    current.status="CANCELLED";
    current.cancelledAt=new Date();
    await current.save();
    await writeAudit({
      organizationId:session.organizationId,
      actorUserId:session.sub,
      action:"vehicle_route_assignment.cancel",
      entityType:"VehicleRouteAssignment",
      entityId:String(current._id)
    });
    return NextResponse.json({assignment:current});
  }catch(error){return apiError(error)}
}
