import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiSession } from "@/src/lib/auth";
import { assertPermission } from "@/src/lib/authorization";
import { connectDb } from "@/src/lib/db";
import { apiError } from "@/src/lib/http";
import { Vehicle } from "@/src/core/models/Vehicle";
import { Journey } from "@/src/core/models/Journey";
import { writeAudit } from "@/src/core/services/audit";
import { requireVehicleCapacity } from "@/src/core/services/subscription-access";
import { withVehicleCapacityLock } from "@/src/core/services/vehicle-capacity-lock";

const Patch=z.object({
  economicNumber:z.string().min(1).max(40).optional(),
  plates:z.string().max(30).nullable().optional(),
  model:z.string().max(80).nullable().optional(),
  capacity:z.number().int().min(1).max(100).nullable().optional(),
  status:z.enum(["active","maintenance","archived"]).optional()
}).refine(value=>Object.keys(value).length>0,{message:"At least one field is required"});

export const runtime="nodejs";

export async function PATCH(request:Request,{params}:{params:Promise<{vehicleId:string}>}){
  try{
    const session=assertPermission(await requireApiSession(request,["company_portal"]),"manage_vehicles");
    if(!session.organizationId)throw new Error("FORBIDDEN");
    const {vehicleId}=await params;
    const patch=Patch.parse(await request.json());
    await connectDb();
    const vehicle=await withVehicleCapacityLock(session.organizationId,async(renew)=>{
    if(patch.status && patch.status!=="archived"){
      const existing=await Vehicle.findOne({_id:vehicleId,organizationId:session.organizationId});
      if(!existing)return NextResponse.json({error:"Vehicle not found"},{status:404});
      if(existing.status==="archived")await requireVehicleCapacity(session.organizationId!);
    }

    if(patch.status==="maintenance"||patch.status==="archived"){
      const active=await Journey.exists({
        organizationId:session.organizationId,
        vehicleId,
        state:{$nin:["FINISHED","CANCELLED"]}
      });
      if(active)return NextResponse.json({error:"VEHICLE_HAS_ACTIVE_JOURNEY"},{status:409});
    }

    const update:any={$set:{...patch}};
    if(patch.status==="maintenance"||patch.status==="archived"){
      update.$unset={driverId:1};
    }
    await renew();
    return Vehicle.findOneAndUpdate(
      {_id:vehicleId,organizationId:session.organizationId},
      update,
      {new:true,runValidators:true,maxTimeMS:10_000}
    );
    });
    if(vehicle instanceof Response)return vehicle;
    if(!vehicle)return NextResponse.json({error:"Vehicle not found"},{status:404});

    await writeAudit({
      organizationId:session.organizationId,
      actorUserId:session.sub,
      action:"vehicle.update",
      entityType:"Vehicle",
      entityId:vehicleId,
      metadata:patch
    });
    return NextResponse.json({vehicle});
  }catch(error){return apiError(error)}
}
