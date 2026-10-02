import type { OperationalUnitSnapshot } from "@/src/core/contracts/telemetry";
import { getGpsFreshness } from "@/src/core/domain/gps-freshness";

export function vehicleToSnapshot(vehicle:any, journeyId:string|null=null):OperationalUnitSnapshot {
  const loc=vehicle.lastLocation;
  const progress=vehicle.activeRouteProgress||null;
  return {
    vehicleId:String(vehicle._id),
    economicNumber:vehicle.economicNumber,
    status:vehicle.status,
    driverId:vehicle.driverId?String(vehicle.driverId):null,
    routeId:progress?.routeId||(vehicle.routeId?String(vehicle.routeId):null),
    journeyId,
    latitude:loc?.latitude??null,
    longitude:loc?.longitude??null,
    speedKmH:Math.round((loc?.speedMps||0)*3.6*10)/10,
    heading:loc?.heading??null,
    recordedAt:loc?.recordedAt?new Date(loc.recordedAt).toISOString():null,
    freshness:getGpsFreshness(loc?.recordedAt),
    routeName:progress?.routeName??null,
    progressPercent:progress?.progressPercent??null,
    distanceFromRouteM:progress?.distanceFromRouteM??null,
    distanceRemainingM:progress?.distanceRemainingM??null,
    isOffRoute:Boolean(progress?.isOffRoute),
    routeState:progress?.routeState??null,
    etaMinutes:progress?.etaMinutes??null,
    etaAt:progress?.etaAt??null,
    nextStop:progress?.nextStop??null
  };
}
