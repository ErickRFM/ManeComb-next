import { randomUUID } from "node:crypto";
import { getRedis } from "@/src/lib/redis";
import { redisKey } from "@/src/lib/runtime-namespace";

const RELEASE="if redis.call('get',KEYS[1])==ARGV[1] then return redis.call('del',KEYS[1]) else return 0 end";
const RENEW="if redis.call('get',KEYS[1])==ARGV[1] then return redis.call('pexpire',KEYS[1],ARGV[2]) else return 0 end";
const LEASE_MS=30_000;

// All fleet create/status mutations share this organization lock across web instances.
export async function withVehicleCapacityLock<T>(organizationId:string,operation:(renew:()=>Promise<void>)=>Promise<T>):Promise<T>{
  const source=getRedis();
  if(!source)throw new Error("VEHICLE_CAPACITY_UNAVAILABLE");
  const redis=source.duplicate({lazyConnect:true,maxRetriesPerRequest:1,commandTimeout:2_000,connectTimeout:2_000,enableOfflineQueue:false,retryStrategy:()=>null});
  redis.on("error",()=>undefined);
  const key=redisKey("vehicle-capacity", organizationId);
  const token=randomUUID();
  let timer:ReturnType<typeof setInterval>|undefined;
  let acquired=false;
  const renew=async()=>{
    if(Number(await redis.eval(RENEW,1,key,token,String(LEASE_MS)))!==1)throw new Error("VEHICLE_CAPACITY_UNAVAILABLE");
  };
  try{
    await redis.connect().catch(()=>{throw new Error("VEHICLE_CAPACITY_UNAVAILABLE")});
    const deadline=Date.now()+10_000;
    while(await redis.set(key,token,"PX",LEASE_MS,"NX").catch(()=>{throw new Error("VEHICLE_CAPACITY_UNAVAILABLE")})!=="OK"){
      if(Date.now()>=deadline)throw new Error("VEHICLE_CAPACITY_BUSY");
      await new Promise(resolve=>setTimeout(resolve,50));
    }
    acquired=true;
    timer=setInterval(()=>{void renew().catch(()=>undefined)},5_000);
    timer.unref();
    return await operation(renew);
  }
  finally{
    if(timer)clearInterval(timer);
    if(acquired)await redis.eval(RELEASE,1,key,token).catch(()=>undefined);
    redis.disconnect();
  }
}
