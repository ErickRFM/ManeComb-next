import mongoose from "mongoose";
import { getEnv } from "@/src/lib/env";
import { incrementMetric, observeDuration, setGauge } from "@/src/lib/metrics";

type Cache = { connection: typeof mongoose | null; promise: Promise<typeof mongoose> | null };
const globalCache = globalThis as typeof globalThis & { __manecombMongoose?: Cache };
const cache = globalCache.__manecombMongoose || { connection: null, promise: null };
globalCache.__manecombMongoose = cache;

export async function connectDb() {
  if (cache.connection) return cache.connection;
  const uri = getEnv().mongodbUri;
  if (!uri) throw new Error("MONGODB_URI is not configured");
  if (!cache.promise) cache.promise = mongoose.connect(uri, { maxPoolSize: 20, serverSelectionTimeoutMS: 5000, monitorCommands:true });
  const promise = cache.promise;
  try {
    cache.connection = await promise;
    if(cache.connection.connection.readyState===1){
      const client=cache.connection.connection.getClient();
      if(!(client as any).__manecombMetrics){
        (client as any).__manecombMetrics=true;
        let busy=0;
        const commands=new Map<number,{started:number;command:string}>();
        client.on("connectionCheckedOut",event=>{
          busy++;setGauge("mongo_pool_checked_out",busy);
          observeDuration("mongo_pool_checkout_ms",event.durationMS);
        });
        client.on("connectionCheckedIn",()=>{busy=Math.max(0,busy-1);setGauge("mongo_pool_checked_out",busy)});
        client.on("connectionCheckOutFailed",()=>incrementMetric("mongo_pool_checkout_failures_total"));
        client.on("commandStarted",event=>commands.set(event.requestId,{started:performance.now(),command:["find","update","insert","aggregate","getMore","commitTransaction","abortTransaction"].includes(event.commandName)?event.commandName:"other"}));
        const complete=(event:{requestId:number})=>{
          const operation=commands.get(event.requestId);commands.delete(event.requestId);
          if(operation)observeDuration("mongo_command_ms",performance.now()-operation.started,{command:operation.command});
        };
        client.on("commandSucceeded",complete);client.on("commandFailed",complete);
      }
    }
    return cache.connection;
  } catch (error) {
    if (cache.promise === promise) cache.promise = null;
    throw error;
  }
}

export async function checkDb() {
  try {
    const db = await connectDb();
    await db.connection.db?.admin().ping();
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : "database unavailable" };
  }
}
