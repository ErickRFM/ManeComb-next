import type { OperationalUnitSnapshot } from "@/src/core/contracts/telemetry";

export const FLEET_CLUSTER_THRESHOLD=100;

export function shouldClusterFleet(count:number,threshold=FLEET_CLUSTER_THRESHOLD){
  return Number.isFinite(count)&&count>=threshold;
}

export function fleetMarkerState(unit:OperationalUnitSnapshot){
  if(unit.isOffRoute||unit.freshness==="lost")return "danger";
  if(unit.freshness==="stale"||unit.freshness==="delayed")return "warn";
  return "good";
}

export function fleetToGeoJson(units:OperationalUnitSnapshot[]){
  return {
    type:"FeatureCollection" as const,
    features:units
      .filter(unit=>unit.latitude!==null&&unit.longitude!==null)
      .map(unit=>({
        type:"Feature" as const,
        properties:{
          vehicleId:unit.vehicleId,
          economicNumber:unit.economicNumber,
          state:fleetMarkerState(unit)
        },
        geometry:{
          type:"Point" as const,
          coordinates:[unit.longitude as number,unit.latitude as number]
        }
      }))
  };
}
