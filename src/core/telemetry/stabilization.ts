import { distanceMeters } from "@/src/core/domain/route-progress";
import { classifyGpsQuality,detectJump,type GpsPoint } from "./quality";

export function canonicalizeGps(incoming:GpsPoint,previous?:GpsPoint|null,candidate?:GpsPoint|null){
  const quality=classifyGpsQuality(incoming.accuracy);
  const result={position:{...incoming},quality,liveEligible:true,stabilized:false,reason:"movement",candidate:null as GpsPoint|null};
  if(incoming.accuracy!==undefined&&incoming.accuracy>100)return {...result,liveEligible:false,reason:"poor_accuracy"};
  if(!previous)return {...result,reason:"initial"};
  if(detectJump(previous,incoming).suspicious){
    const candidateAge=candidate?incoming.recordedAt.getTime()-new Date(candidate.recordedAt).getTime():0;
    const recovered=candidate&&candidateAge>0&&candidateAge<=30_000&&candidate.accuracy!==undefined&&candidate.accuracy<=50&&incoming.accuracy!==undefined&&incoming.accuracy<=50&&!detectJump(candidate,incoming).suspicious;
    if(recovered)return {...result,reason:"gps_recovery"};
    return {...result,liveEligible:false,reason:"impossible_jump",candidate:{...incoming}};
  }
  const stationary=incoming.speedMps<0.8&&previous.speedMps<0.8;
  if(stationary&&incoming.accuracy!==undefined&&incoming.accuracy<=50&&distanceMeters(previous,incoming)<8){
    return {...result,position:{...incoming,latitude:previous.latitude,longitude:previous.longitude},stabilized:true,reason:"stationary_heartbeat"};
  }
  return result;
}
export type CanonicalGpsDecision=ReturnType<typeof canonicalizeGps>;
