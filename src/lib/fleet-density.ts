import type { OperationalUnitSnapshot } from "@/src/core/contracts/telemetry";

export const FLEET_CLUSTER_THRESHOLD=100;

export function fleetCameraPadding(width:number,height:number,mobile:boolean){
  const desired=mobile?{top:24,right:24,bottom:240,left:24}:{top:70,right:340,bottom:240,left:70};
  const horizontal=Math.min(1,Math.max(0,width)*.65/(desired.left+desired.right));
  const vertical=Math.min(1,Math.max(0,height)*.65/(desired.top+desired.bottom));
  return {top:desired.top*vertical,right:desired.right*horizontal,bottom:desired.bottom*vertical,left:desired.left*horizontal};
}

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
