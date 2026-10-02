import { expect,it } from "vitest";
import { classifyGpsQuality,detectJump } from "@/src/core/telemetry/quality";
import { canonicalizeGps } from "@/src/core/telemetry/stabilization";
const at=new Date("2026-10-01T12:00:00Z");
const previous={latitude:20,longitude:-99,recordedAt:at,speedMps:0,accuracy:5};
const point=(latitude=20,seconds=3,speedMps=0,accuracy=5)=>({latitude,longitude:-99,recordedAt:new Date(at.getTime()+seconds*1000),speedMps,accuracy});
it.each([[5,"GOOD"],[30,"NORMAL"],[300,"POOR"],[undefined,"UNKNOWN"]])("classifies accuracy %s without making missing accuracy bad",(accuracy,quality)=>{
  expect(classifyGpsQuality(accuracy as number|undefined)).toBe(quality);
});
it("keeps a stationary jitter anchor while renewing capture time",()=>{
  const result=canonicalizeGps(point(20.00003),previous);
  expect(result.position.latitude).toBe(20);expect(result.position.recordedAt).toEqual(new Date("2026-10-01T12:00:03Z"));expect(result.stabilized).toBe(true);
});
it("does not hide accumulated slow movement beyond 8m",()=>{
  expect(canonicalizeGps(point(20.00009),previous).position.latitude).toBe(20.00009);
});
it.each([2,5,12])("does not smooth moving fixes at %s m/s",speed=>{
  const result=canonicalizeGps(point(20.00003,3,speed),previous);expect(result.position.latitude).toBe(20.00003);expect(result.stabilized).toBe(false);
});
it("does not smooth a turn or acceleration",()=>{
  const incoming={...point(20,3,5),longitude:-98.9999,heading:90};
  expect(canonicalizeGps(incoming,{...previous,speedMps:4}).position).toMatchObject({longitude:-98.9999,heading:90});
});
it("quarantines a kilometre jump in seconds but preserves its raw fix",()=>{
  expect(detectJump(previous,point(20.01)).suspicious).toBe(true);
  const result=canonicalizeGps(point(20.01),previous);
  expect(result.liveEligible).toBe(false);expect(result.reason).toBe("impossible_jump");
  expect(result.candidate?.latitude).toBe(20.01);
});
it("requires a distinct consistent fix to recover from a quarantined jump",()=>{
  const candidate=point(20.01);
  expect(canonicalizeGps(point(20.01003,6,2),previous,candidate).liveEligible).toBe(true);
  expect(canonicalizeGps(candidate,previous,candidate).liveEligible).toBe(false);
});
it("does not reject movement solely across a long missing interval",()=>{
  expect(canonicalizeGps(point(20.01,180),previous).liveEligible).toBe(true);
});
it("keeps poor accuracy from replacing live coordinates",()=>{
  expect(canonicalizeGps(point(20.001,3,0,500),previous).liveEligible).toBe(false);
});
it("allows a good fix after poor accuracy",()=>{
  expect(canonicalizeGps(point(20.0001,10,3,5),previous).liveEligible).toBe(true);
});
it("allows legacy input with unknown accuracy",()=>{
  expect(canonicalizeGps({...point(20.0001,10,3),accuracy:undefined},previous).liveEligible).toBe(true);
});
