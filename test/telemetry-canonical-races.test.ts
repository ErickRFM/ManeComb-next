import { afterEach,beforeEach,expect,it,vi } from "vitest";
const state=vi.hoisted(()=>({vehicle:null as any,positions:new Map<string,any>(),beforeCas:null as null|((filter:any,update:any)=>void),beforeFinalize:null as null|(()=>void)}));
vi.mock("@/src/core/models/Vehicle",()=>({Vehicle:{
  findOne:async()=>structuredClone(state.vehicle),
  findOneAndUpdate:async(filter:any,update:any)=>{
    state.beforeCas?.(filter,update);
    const actual=state.vehicle.lastLocation?.recordedAt?.getTime()??null;
    const expected=filter["lastLocation.recordedAt"]?.getTime()??null;
    if(actual!==expected)return null;
    for(const [key,value] of Object.entries(update.$set)){
      if(key==="telemetryQuality.candidate")state.vehicle.telemetryQuality={...state.vehicle.telemetryQuality,candidate:value};
      else state.vehicle[key]=structuredClone(value);
    }
    return structuredClone(state.vehicle);
  }
}}));
vi.mock("@/src/core/models/Journey",()=>({Journey:{findOne:()=>({select:async()=>({_id:"j"})})}}));
vi.mock("@/src/core/models/RouteSessionPosition",()=>({RouteSessionPosition:{
  findOneAndUpdate:async(filter:any,update:any)=>{
    const duplicate=state.positions.has(filter.packetId);
    if(!duplicate)state.positions.set(filter.packetId,structuredClone(update.$setOnInsert));
    return {value:structuredClone(state.positions.get(filter.packetId)),lastErrorObject:{updatedExisting:duplicate}};
  },
  updateOne:async(filter:any,update:any)=>{state.beforeFinalize?.();Object.assign(state.positions.get(filter.packetId),structuredClone(update.$set));return {matchedCount:1}},
  findOne:async(filter:any)=>structuredClone(state.positions.get(filter.packetId))
}}));
vi.mock("@/src/core/services/route-projection",()=>({calculateOperationalRouteProgress:async()=>null}));
import { recordTelemetry } from "@/src/core/services/telemetry";
import { TelemetrySchema } from "@/src/core/contracts/telemetry";
const ids=["00000000-0000-4000-8000-000000000001","00000000-0000-4000-8000-000000000002","00000000-0000-4000-8000-000000000003"];
const sample=(id:number,latitude:number,seconds:number,speedMps=0)=>TelemetrySchema.parse({packetId:ids[id],vehicleId:"v",journeyId:"j",latitude,longitude:-99,recordedAt:new Date(`2026-10-01T12:00:0${seconds}Z`),accuracy:5,speedMps});
const ingest=(input:ReturnType<typeof sample>)=>recordTelemetry("org",input,{driverId:"driver"});
beforeEach(()=>{
  vi.useFakeTimers({toFake:["Date"]});vi.setSystemTime(new Date("2026-10-01T12:00:10Z"));
  state.positions.clear();state.beforeCas=null;state.beforeFinalize=null;
  state.vehicle={_id:"v",organizationId:"org",driverId:"driver",economicNumber:"QA",lastLocation:null,telemetryQuality:null};
});
afterEach(()=>vi.useRealTimers());
it("applied replay preserves a newer jump candidate so the next consistent fix recovers",async()=>{
  const a=sample(0,20,0);await ingest(a);
  await ingest(sample(1,20.01,3));
  await ingest(a);
  expect(state.vehicle.telemetryQuality.candidate?.latitude).toBe(20.01);
  expect((await ingest(sample(2,20.01003,6,2))).latitude).toBe(20.01003);
});
it("CAS exhaustion returns a retryable error rather than acknowledging an unapplied newest fix",async()=>{
  await ingest(sample(0,20,0));
  let second=0;
  state.beforeCas=()=>{second++;state.vehicle.lastLocation={latitude:20,longitude:-99,speedMps:0,accuracy:5,recordedAt:new Date(`2026-10-01T12:00:0${second}Z`)};};
  const target=sample(1,20.00012,8);
  await expect(ingest(target)).rejects.toThrow("TELEMETRY_CANONICAL_RETRY");
  state.beforeCas=null;
  expect((await ingest(target)).recordedAt).toBe("2026-10-01T12:00:08.000Z");
});
it("history records the committed canonical anchor after CAS recalculation while keeping raw capture",async()=>{
  await ingest(sample(0,20,0));
  const p=sample(1,20.00012,6);
  state.beforeCas=()=>{state.beforeCas=null;state.vehicle.lastLocation={latitude:20.00010,longitude:-99,speedMps:0,accuracy:5,recordedAt:new Date("2026-10-01T12:00:03Z")};};
  expect((await ingest(p)).latitude).toBe(20.00010);
  const history=state.positions.get(ids[1]);
  expect(history.latitude).toBe(20.00012);
  expect(history.quality.canonicalLatitude).toBe(20.00010);
  expect(history.quality.reason).toBe("stationary_heartbeat");
  expect(history.applicationStatus).toBe("APPLIED");
});
it("duplicate retry completes a packet whose history committed before canonical write failed",async()=>{
  const input=sample(0,20,0);
  state.beforeCas=()=>{throw new Error("temporary_database_failure")};
  await expect(ingest(input)).rejects.toThrow("temporary_database_failure");
  state.beforeCas=null;
  expect((await ingest(input)).latitude).toBe(20);
  expect(state.positions.get(ids[0]).applicationStatus).toBe("APPLIED");
  expect(state.positions.size).toBe(1);
});
it("finalizes a raced superseded packet as out of order rather than live eligible",async()=>{
  await ingest(sample(0,20,0));
  state.beforeCas=()=>{state.beforeCas=null;state.vehicle.lastLocation={latitude:20.0002,longitude:-99,speedMps:4,accuracy:5,recordedAt:new Date("2026-10-01T12:00:08Z")};};
  const result=await ingest(sample(1,20.0001,6,4));
  expect(result.latitude).toBe(20.0002);
  expect(state.positions.get(ids[1]).classification).toBe("out_of_order");
  expect(state.positions.get(ids[1]).applicationStatus).toBe("SUPERSEDED");
});
it("recovers from an untrusted future anchor persisted by legacy ingestion",async()=>{
  state.vehicle.lastLocation={latitude:21,longitude:-99,speedMps:0,accuracy:5,recordedAt:new Date("2026-10-01T12:10:00Z")};
  expect((await ingest(sample(0,20,8))).latitude).toBe(20);
});
it("delayed retry confirms an applied partial write without rejuvenation or deleting newer quality evidence",async()=>{
  const input=sample(0,20,0);
  state.beforeFinalize=()=>{throw new Error("metadata_write_failure")};
  await expect(ingest(input)).rejects.toThrow("metadata_write_failure");
  state.beforeFinalize=null;
  await ingest(sample(1,20.01,3));
  vi.setSystemTime(new Date("2026-10-01T12:00:30Z"));
  const retry=await ingest(input);
  expect(retry.recordedAt).toBe("2026-10-01T12:00:00.000Z");expect(retry.freshness).toBe("delayed");
  expect(state.positions.get(ids[0]).applicationStatus).toBe("APPLIED");
  expect(state.vehicle.telemetryQuality.candidate?.latitude).toBe(20.01);
});
it("a different packet with equal capture time cannot replace a partially committed canonical fix",async()=>{
  const first=sample(0,20,3,4);
  state.beforeFinalize=()=>{throw new Error("metadata_write_failure")};
  await expect(ingest(first)).rejects.toThrow("metadata_write_failure");
  state.beforeFinalize=null;
  const collision=sample(1,20.0002,3,4);
  expect((await ingest(collision)).latitude).toBe(20);
  expect(state.positions.get(ids[1]).applicationStatus).toBe("SUPERSEDED");
  expect((await ingest(first)).latitude).toBe(20);
  expect(state.positions.get(ids[0]).quality.canonicalLatitude).toBe(20);
  expect(state.positions.get(ids[0]).applicationStatus).toBe("APPLIED");
});
