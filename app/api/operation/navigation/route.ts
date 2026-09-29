import { NextResponse } from "next/server";
import { requireApiSession } from "@/src/lib/auth";
import { connectDb } from "@/src/lib/db";
import { apiError } from "@/src/lib/http";
import { Journey } from "@/src/core/models/Journey";
import { Route } from "@/src/core/models/Route";
import { Vehicle } from "@/src/core/models/Vehicle";
import { vehicleToSnapshot } from "@/src/core/services/telemetry";

export const runtime="nodejs";

export async function GET(request:Request){
  try{
    const session=await requireApiSession(request,["mobile_operations"]);
    if(!session.organizationId)throw new Error("FORBIDDEN");
    await connectDb();

    const journey=await Journey.findOne({
      organizationId:session.organizationId,
      driverId:session.sub,
      state:{$in:["ASSIGNED","READY","RUNNING","PAUSED"]}
    }).sort({createdAt:-1});
    if(!journey)return NextResponse.json({journey:null,route:null,snapshot:null});

    const [vehicle,route]=await Promise.all([
      Vehicle.findOne({_id:journey.vehicleId,organizationId:session.organizationId}),
      journey.routeId?Route.findOne({_id:journey.routeId,organizationId:session.organizationId}):null
    ]);

    return NextResponse.json({
      journey:{
        id:String(journey._id),
        state:journey.state,
        vehicleId:String(journey.vehicleId),
        routeId:journey.routeId?String(journey.routeId):null,
        startedAt:journey.startedAt||null
      },
      route:route?{
        id:String(route._id),
        name:route.name,
        origin:route.origin||null,
        destination:route.destination||null,
        revision:route.revision||1,
        geometry:route.geometry||[],
        stops:route.stops||[]
      }:null,
      snapshot:vehicle?vehicleToSnapshot(vehicle,String(journey._id)):null
    });
  }catch(error){return apiError(error)}
}
