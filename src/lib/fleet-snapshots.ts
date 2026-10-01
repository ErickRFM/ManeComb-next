import type { OperationalUnitSnapshot } from "@/src/core/contracts/telemetry";

function timestamp(unit:OperationalUnitSnapshot){
  const value=unit.recordedAt?Date.parse(unit.recordedAt):NaN;
  return Number.isFinite(value)?value:-Infinity;
}

// HTTP supplies the object references present when its request began. An equal-time
// socket update arriving during that request wins; older cached state does not.
export function mergeSnapshots(current:OperationalUnitSnapshot[],incoming:OperationalUnitSnapshot[],requestStart?:OperationalUnitSnapshot[]):OperationalUnitSnapshot[]{
  const byId=new Map(current.map(unit=>[unit.vehicleId,unit]));
  const atStart=requestStart?new Map(requestStart.map(unit=>[unit.vehicleId,unit])):null;
  for(const unit of incoming){
    const previous=byId.get(unit.vehicleId);
    if(!previous||timestamp(unit)>timestamp(previous)||(timestamp(unit)===timestamp(previous)&&(!atStart||previous===atStart.get(unit.vehicleId))))byId.set(unit.vehicleId,unit);
  }
  return [...byId.values()];
}

export function gpsStatusText(live:number,degraded:number){
  if(degraded)return degraded+" requieren atención";
  return live?"Telemetría estable":"Sin unidades reportando";
}
