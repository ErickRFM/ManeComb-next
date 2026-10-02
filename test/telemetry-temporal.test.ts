import { describe, expect, it } from "vitest";
import { TelemetrySchema } from "@/src/core/contracts/telemetry";
import { resolveTemporalAuthority } from "@/src/core/telemetry/temporal";

const now=new Date("2026-10-01T12:00:00Z");
const packet=(offset=0,evidence?:Record<string,unknown>)=>TelemetrySchema.parse({vehicleId:"v",latitude:20,longitude:-99,recordedAt:new Date(now.getTime()+offset),temporalEvidence:evidence});
describe("telemetry temporal authority",()=>{
  it("keeps legacy capture time without using receive time",()=>{
    expect(resolveTemporalAuthority(packet(-3000),now).classification).toBe("live_eligible");
    expect(resolveTemporalAuthority(packet(-3000),now).canonicalRecordedAt).toEqual(new Date("2026-10-01T11:59:57Z"));
  });
  it.each([300_000,1_200_000])("preserves %s ms backlog as historical only",age=>{
    const result=resolveTemporalAuthority(packet(-age),now);
    expect(result.classification).toBe("historical_only");
    expect(result.liveEligible).toBe(false);
    expect(result.canonicalRecordedAt).toEqual(new Date(now.getTime()-age));
  });
  it("does not trust a future clock",()=>{
    expect(resolveTemporalAuthority(packet(600_000),now).classification).toBe("invalid_untrusted_time");
    expect(resolveTemporalAuthority(packet(600_000),now).liveEligible).toBe(false);
  });
  it("cannot shorten backlog with a self-declared queue age",()=>{
    expect(resolveTemporalAuthority(packet(-1_200_000,{queueAgeMs:0,queueAgeSource:"android_elapsed_realtime"}),now).classification).toBe("historical_only");
  });
  const monotonic={queueAgeMs:1_200_000,queueAgeSource:"android_elapsed_realtime",capturedElapsedRealtimeMs:1000,sentElapsedRealtimeMs:1_201_000,capturedBootCount:9,bootCount:9};
  it("uses authenticated same-boot monotonic age to detect backlog despite an advanced clock",()=>{
    const result=resolveTemporalAuthority(packet(600_000,monotonic),now,{temporalSource:"android_device_session"});
    expect(result.classification).toBe("historical_only");
    expect(result.canonicalRecordedAt).toEqual(new Date("2026-10-01T11:40:00Z"));
  });
  it("does not admit evidence copied over a boot change",()=>{
    expect(resolveTemporalAuthority(packet(0,{...monotonic,bootCount:10}),now,{temporalSource:"android_device_session"}).liveEligible).toBe(false);
  });
  it("does not mark a reboot backlog live when uploader explicitly loses monotonic continuity",()=>{
    expect(resolveTemporalAuthority(packet(0,{...monotonic,bootCount:10,queueAgeSource:"unknown"}),now,{temporalSource:"android_device_session"}).liveEligible).toBe(false);
  });
  it("does not admit contradictory monotonic age",()=>{
    expect(resolveTemporalAuthority(packet(0,{...monotonic,queueAgeMs:0}),now,{temporalSource:"android_device_session"}).liveEligible).toBe(false);
  });
  it("accepts live capture after backlog without receipt rejuvenation",()=>{
    const result=resolveTemporalAuthority(packet(-1000,{...monotonic,queueAgeMs:1000,sentElapsedRealtimeMs:2000}),now,{temporalSource:"android_device_session"});
    expect(result.classification).toBe("live_eligible");
    expect(result.canonicalRecordedAt).toEqual(new Date("2026-10-01T11:59:59Z"));
  });
  it("keeps an invalid date out of live decisions",()=>{
    expect(resolveTemporalAuthority({...packet(),recordedAt:new Date(NaN)},now).liveEligible).toBe(false);
  });
  it("rejects claimed monotonic authority when boot is unknown",()=>{
    const {capturedBootCount:_,bootCount:__,...unknown}=monotonic;
    expect(resolveTemporalAuthority(packet(0,unknown),now,{temporalSource:"android_device_session"}).liveEligible).toBe(false);
  });
  it("keeps queue age without authenticated monotonic proof from extending freshness",()=>{
    const input=packet(-1_200_000,{queueAgeMs:0,queueAgeSource:"unknown"});
    expect(resolveTemporalAuthority(input,now,{temporalSource:"android_device_session"}).classification).toBe("historical_only");
  });
  it.each([-1,NaN,Infinity,5001])("rejects invalid accuracy %s at the public contract",accuracy=>{
    expect(()=>TelemetrySchema.parse({...packet(),accuracy})).toThrow();
  });
});
