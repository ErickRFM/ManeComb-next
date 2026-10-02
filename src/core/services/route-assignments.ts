import mongoose, { type ClientSession } from "mongoose";
import { Route } from "@/src/core/models/Route";
import { Vehicle } from "@/src/core/models/Vehicle";
import { VehicleRouteAssignment } from "@/src/core/models/VehicleRouteAssignment";

type ActivateInput={
  organizationId:string;
  vehicleId:string;
  routeId:string;
  actorUserId?:string;
  session?:ClientSession;
};

async function activateInSession(input:ActivateInput,session:ClientSession){
  const [route,vehicle]=await Promise.all([
    Route.findOne({_id:input.routeId,organizationId:input.organizationId,status:{$ne:"archived"}}).session(session).select("_id revision").lean(),
    Vehicle.findOne({_id:input.vehicleId,organizationId:input.organizationId,status:{$ne:"archived"}}).session(session).select("_id").lean()
  ]);
  if(!route)throw new Error("Route not found");
  if(!vehicle)throw new Error("Vehicle not found");

  await VehicleRouteAssignment.updateMany(
    {organizationId:input.organizationId,vehicleId:input.vehicleId,status:"ACTIVE",routeId:{$ne:input.routeId}},
    {$set:{status:"AVAILABLE",activatedAt:null}},
    {session}
  );

  const assignment=await VehicleRouteAssignment.findOneAndUpdate(
    {organizationId:input.organizationId,vehicleId:input.vehicleId,routeId:input.routeId},
    {
      $set:{
        status:"ACTIVE",
        routeRevision:Number((route as any).revision||1),
        activatedAt:new Date(),
        ...(input.actorUserId?{assignedBy:input.actorUserId}: {})
      },
      $inc:{activationVersion:1},
      $setOnInsert:{assignedAt:new Date()}
    },
    {upsert:true,new:true,runValidators:true,setDefaultsOnInsert:true,session}
  );
  if(!assignment)throw new Error("Route assignment could not be activated");

  await Vehicle.updateOne(
    {_id:input.vehicleId,organizationId:input.organizationId},
    {$set:{routeId:input.routeId}},
    {session}
  );
  return assignment;
}

export async function activateVehicleRouteAssignment(input:ActivateInput){
  if(input.session)return activateInSession(input,input.session);
  const session=await mongoose.startSession();
  let assignment:any=null;
  try{
    await session.withTransaction(async()=>{assignment=await activateInSession(input,session)});
  }finally{
    await session.endSession();
  }
  return assignment;
}

export async function upsertVehicleRouteAssignment(input:{
  organizationId:string;
  vehicleId:string;
  routeId:string;
  actorUserId?:string;
  status:"AVAILABLE"|"SCHEDULED";
  priority?:number;
  selectableByDriver?:boolean;
  scheduledFrom?:Date|null;
  scheduledUntil?:Date|null;
}){
  if(input.scheduledFrom&&input.scheduledUntil&&input.scheduledUntil<=input.scheduledFrom){
    throw new Error("scheduledUntil must be after scheduledFrom");
  }
  const [route,vehicle]=await Promise.all([
    Route.exists({_id:input.routeId,organizationId:input.organizationId,status:{$ne:"archived"}}),
    Vehicle.exists({_id:input.vehicleId,organizationId:input.organizationId,status:{$ne:"archived"}})
  ]);
  if(!route)throw new Error("Route not found");
  if(!vehicle)throw new Error("Vehicle not found");

  return VehicleRouteAssignment.findOneAndUpdate(
    {organizationId:input.organizationId,vehicleId:input.vehicleId,routeId:input.routeId},
    {$set:{
      status:input.status,
      priority:input.priority??100,
      selectableByDriver:input.selectableByDriver??true,
      scheduledFrom:input.scheduledFrom??null,
      scheduledUntil:input.scheduledUntil??null,
      ...(input.actorUserId?{assignedBy:input.actorUserId}: {})
    },$setOnInsert:{assignedAt:new Date()}},
    {upsert:true,new:true,runValidators:true,setDefaultsOnInsert:true}
  );
}
