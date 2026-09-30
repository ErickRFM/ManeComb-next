import { beforeEach, expect, it, vi } from "vitest";
const fixture=vi.hoisted(()=>({vehicle:{_id:"vehicle",organizationId:"org",economicNumber:"C-1",driverId:"driver",lastLocation:null as any},pauseOld:null as null|(()=>Promise<void>)}));
vi.mock("@/src/core/models/Vehicle",()=>({Vehicle:{
  findOne:async()=>structuredClone(fixture.vehicle),
  updateOne:async(filter:any,update:any)=>{
    if(update.$set.lastLocation.latitude===1&&fixture.pauseOld)await fixture.pauseOld();
    Object.assign(fixture.vehicle,update.$set);
  },
  findOneAndUpdate:async(filter:any,update:any)=>{
    if(update.$set.lastLocation.latitude===1&&fixture.pauseOld)await fixture.pauseOld();
    if(fixture.vehicle.lastLocation&&fixture.vehicle.lastLocation.recordedAt>update.$set.lastLocation.recordedAt)return null;
    Object.assign(fixture.vehicle,update.$set);return structuredClone(fixture.vehicle);
  }
}}));
vi.mock("@/src/core/models/Journey",()=>({Journey:{findOne:()=>({select:async()=>({_id:"journey"})})}}));
vi.mock("@/src/core/models/RouteSessionPosition",()=>({RouteSessionPosition:{create:async()=>undefined,updateOne:async()=>undefined,findOneAndUpdate:async(_filter:any,update:any)=>update.$setOnInsert}}));
vi.mock("@/src/core/services/route-projection",()=>({calculateOperationalRouteProgress:async()=>null}));
import { recordTelemetry } from "@/src/core/services/telemetry";
beforeEach(()=>{fixture.vehicle.lastLocation=null;fixture.pauseOld=null});
it("cannot regress live GPS when an older write completes after a newer packet",async()=>{
  let releaseOld!:()=>void;let oldReached!:()=>void;
  const oldWrite=new Promise<void>(resolve=>releaseOld=resolve);
  const reached=new Promise<void>(resolve=>oldReached=resolve);
  fixture.pauseOld=()=>{oldReached();return oldWrite};
  const sample={vehicleId:"vehicle",journeyId:"journey",latitude:1,longitude:1,speedMps:0,recordedAt:new Date("2026-09-30T00:00:00Z")};
  const old=recordTelemetry("org",sample,{driverId:"driver"});
  await reached;
  await recordTelemetry("org",{...sample,latitude:2,recordedAt:new Date("2026-09-30T00:00:03Z")},{driverId:"driver"});
  releaseOld();const result=await old;
  expect(fixture.vehicle.lastLocation.latitude).toBe(2);
  expect(result.latitude).toBe(2);
});
