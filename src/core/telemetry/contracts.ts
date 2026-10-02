export type { TelemetryInput, OperationalUnitSnapshot } from "@/src/core/contracts/telemetry";
export type DatabasePhase = <T>(phase:string,operation:()=>PromiseLike<T>)=>Promise<T>;
export type TelemetryContext = { driverId?:string; temporalSource?:"android_device_session" };
export type TelemetryClassification = "live_eligible"|"historical_only"|"duplicate"|"out_of_order"|"invalid_untrusted_time";
export type TemporalDecision = {
  classification:TelemetryClassification;
  liveEligible:boolean;
  canonicalRecordedAt:Date;
  reason:string;
  trustedMonotonic:boolean;
};
