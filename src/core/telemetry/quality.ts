import { distanceMeters } from "@/src/core/domain/route-progress";

export type GpsPoint={latitude:number;longitude:number;recordedAt:Date;speedMps:number;accuracy?:number;heading?:number};
export function classifyGpsQuality(accuracy?:number):"GOOD"|"NORMAL"|"POOR"|"UNKNOWN"{
  if(accuracy===undefined||!Number.isFinite(accuracy))return "UNKNOWN";
  return accuracy<=15?"GOOD":accuracy<=50?"NORMAL":"POOR";
}
export function detectJump(previous:GpsPoint,incoming:GpsPoint){
  const distance=distanceMeters(previous,incoming);
  const elapsedMs=incoming.recordedAt.getTime()-new Date(previous.recordedAt).getTime();
  const uncertainty=(previous.accuracy??25)+(incoming.accuracy??25)+30;
  const impliedSpeedMps=elapsedMs>0?Math.max(0,distance-uncertainty)/(elapsedMs/1000):Infinity;
  // After a long gap there is no evidence that the move happened in a few seconds.
  const suspicious=elapsedMs<120_000&&distance>uncertainty&&impliedSpeedMps>Math.max(70,incoming.speedMps+30);
  return {suspicious,distanceMeters:distance,elapsedMs,impliedSpeedMps};
}
