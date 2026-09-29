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
        vehicle.lastFreshness=next;
        await vehicle.save();
        io.to("org:"+String(vehicle.organizationId)).emit("location:snapshot",vehicleToSnapshot(vehicle));
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
