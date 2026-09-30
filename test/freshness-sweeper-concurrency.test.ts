import { afterEach, expect, it, vi } from "vitest";

const fixture=vi.hoisted(()=>({current:null as any,emitted:[] as any[]}));
vi.mock("@/src/lib/db",()=>({connectDb:async()=>undefined}));
vi.mock("@/src/core/services/telemetry",()=>({vehicleToSnapshot:(vehicle:any)=>({latitude:vehicle.lastLocation.latitude,freshness:vehicle.lastFreshness})}));
vi.mock("@/src/core/models/Vehicle",()=>({Vehicle:{
  find:()=>({limit:async()=>{
    const stale={...fixture.current,lastLocation:{...fixture.current.lastLocation},save:async function(){fixture.current.lastFreshness=this.lastFreshness}};
    // A newer telemetry packet commits after the sweep reads its snapshot.
    fixture.current.lastLocation={latitude:2,recordedAt:new Date()};
    fixture.current.lastFreshness="live";
    return [stale];
  }}),
  findOneAndUpdate:async(filter:any,update:any)=>{
    if(+filter["lastLocation.recordedAt"]!==+fixture.current.lastLocation.recordedAt)return null;
    Object.assign(fixture.current,update.$set);return fixture.current;
  }
}}));
import { startFreshnessSweeper } from "@/src/realtime/services/freshness-sweeper";

afterEach(()=>vi.restoreAllMocks());
it("does not downgrade or publish an obsolete location after concurrent telemetry",async()=>{
  fixture.current={_id:"vehicle",organizationId:"org",status:"running",lastFreshness:"live",lastLocation:{latitude:1,recordedAt:new Date(Date.now()-600_000)}};
  fixture.emitted=[];
  const io={to:()=>({emit:(_event:string,payload:any)=>fixture.emitted.push(payload)})};
  const stop=startFreshnessSweeper(io as any);
  try {
    await new Promise(resolve=>setTimeout(resolve,20));
    expect(fixture.current.lastFreshness).toBe("live");
    expect(fixture.emitted).toEqual([]);
  } finally {stop()}
});
