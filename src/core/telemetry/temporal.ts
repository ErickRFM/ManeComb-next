import type { TelemetryInput } from "@/src/core/contracts/telemetry";
import { GPS_FRESHNESS_MS } from "@/src/core/domain/gps-freshness";
import type { TelemetryContext, TemporalDecision } from "./contracts";

export function resolveTemporalAuthority(input:TelemetryInput,receivedAt:Date,context:TelemetryContext={}):TemporalDecision{
  const evidence=input.temporalEvidence;
  const captured=input.recordedAt;
  const wallMs=captured.getTime();
  const receivedMs=receivedAt.getTime();
  const invalid=(reason:string):TemporalDecision=>({classification:"invalid_untrusted_time",liveEligible:false,canonicalRecordedAt:captured,reason,trustedMonotonic:false});
  if(!Number.isFinite(wallMs)||!Number.isFinite(receivedMs))return invalid("invalid_capture_time");
  if(evidence?.capturedAt&&evidence.capturedAt.getTime()!==wallMs)return invalid("capture_time_conflict");
  let canonicalMs=wallMs;
  let trustedMonotonic=false;
  if(context.temporalSource==="android_device_session"&&evidence?.capturedBootCount!==undefined&&evidence.bootCount!==undefined&&evidence.capturedBootCount!==evidence.bootCount)return invalid("boot_discontinuity");
  if(context.temporalSource==="android_device_session"&&evidence?.queueAgeSource==="android_elapsed_realtime"){
    const {queueAgeMs,capturedElapsedRealtimeMs,sentElapsedRealtimeMs,capturedBootCount,bootCount}=evidence;
    if(capturedBootCount===undefined||bootCount===undefined||capturedBootCount!==bootCount)return invalid("boot_discontinuity");
    if(queueAgeMs===undefined||capturedElapsedRealtimeMs===undefined||sentElapsedRealtimeMs===undefined||sentElapsedRealtimeMs<capturedElapsedRealtimeMs||Math.abs(sentElapsedRealtimeMs-capturedElapsedRealtimeMs-queueAgeMs)>1000)return invalid("monotonic_inconsistent");
    // Queue residence can only make a position older. It cannot rejuvenate an old wall capture.
    canonicalMs=Math.min(wallMs,receivedMs-queueAgeMs);
    trustedMonotonic=true;
  }
  if(canonicalMs>receivedMs+5000)return invalid("future_capture_time");
  const age=Math.max(0,receivedMs-canonicalMs);
  const liveEligible=age<=GPS_FRESHNESS_MS.live;
  return {classification:liveEligible?"live_eligible":"historical_only",liveEligible,canonicalRecordedAt:new Date(Math.min(canonicalMs,receivedMs)),reason:liveEligible?"capture_current":"capture_delayed",trustedMonotonic};
}
