import type { OperationalUnitSnapshot } from "@/src/core/contracts/telemetry";

function timestamp(unit:OperationalUnitSnapshot){
  const value=unit.recordedAt?Date.parse(unit.recordedAt):NaN;
  return Number.isFinite(value)?value:-Infinity;
}

export function mergeSnapshots(current:OperationalUnitSnapshot[],incoming:OperationalUnitSnapshot[]):OperationalUnitSnapshot[]{
  const byId=new Map(current.map(unit=>[unit.vehicleId,unit]));
  for(const unit of incoming){
    const previous=byId.get(unit.vehicleId);
    if(!previous||timestamp(unit)>=timestamp(previous))byId.set(unit.vehicleId,unit);
  }
  return [...byId.values()];
}

export function gpsStatusText(live:number,degraded:number){
  if(degraded)return degraded+" requieren atención";
  return live?"Telemetría estable":"Sin unidades reportando";
}
