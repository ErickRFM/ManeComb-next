import type { Server } from "socket.io";
import { connectDb } from "@/src/lib/db";
import { getGpsFreshness } from "@/src/core/domain/gps-freshness";
import { Vehicle } from "@/src/core/models/Vehicle";
import { vehicleToSnapshot } from "@/src/core/services/telemetry";

export function startFreshnessSweeper(io:Server){
  let running=false;
  const tick=async()=>{
    if(running)return;
    running=true;
    try{
      await connectDb();
      const vehicles=await Vehicle.find({
        status:{$ne:"archived"},
        "lastLocation.recordedAt":{$exists:true}
      }).limit(10_000);
      for(const vehicle of vehicles){
        const next=getGpsFreshness(vehicle.lastLocation?.recordedAt);
        if(vehicle.lastFreshness===next)continue;
        // A packet may have committed since this sweep read the vehicle. Only
        // change freshness while the location and previous classification match.
        const updated=await Vehicle.findOneAndUpdate({
          _id:vehicle._id,organizationId:vehicle.organizationId,
          status:{$ne:"archived"},
          "lastLocation.recordedAt":vehicle.lastLocation.recordedAt,
          lastFreshness:vehicle.lastFreshness
        },{$set:{lastFreshness:next}},{new:true});
        if(updated)io.to("org:"+String(updated.organizationId)).emit("location:snapshot",vehicleToSnapshot(updated));
      }
    }catch(error){
      console.error("[freshness-sweeper]",error);
    }finally{running=false}
  };
  const timer=setInterval(()=>void tick(),5_000);
  timer.unref();
  void tick();
  return ()=>clearInterval(timer);
}
