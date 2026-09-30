import type { TelemetryInput, OperationalUnitSnapshot } from "@/src/core/contracts/telemetry";
import { getGpsFreshness } from "@/src/core/domain/gps-freshness";
import { observeDuration } from "@/src/lib/metrics";
import { Vehicle } from "@/src/core/models/Vehicle";
import { Journey } from "@/src/core/models/Journey";
import { RouteSessionPosition } from "@/src/core/models/RouteSessionPosition";
import { calculateOperationalRouteProgress } from "@/src/core/services/route-projection";

export async function recordTelemetry(
  organizationId: string,
  input: TelemetryInput,
  context?: { driverId?: string }
): Promise<OperationalUnitSnapshot> {
  const vehicleQuery: Record<string, unknown> = { _id: input.vehicleId, organizationId };
  if (context?.driverId) vehicleQuery.driverId = context.driverId;
  const vehicle = await Vehicle.findOne(vehicleQuery);
  if (!vehicle) throw new Error("Vehicle not assigned to authenticated driver");

  let canonicalJourneyId: string | null = input.journeyId || null;
  if (context?.driverId) {
    const journeyQuery: Record<string, unknown> = {organizationId,vehicleId:vehicle._id,driverId:context.driverId,state:"RUNNING"};
    if (input.journeyId) journeyQuery._id = input.journeyId;
    const journey = await Journey.findOne(journeyQuery).select("_id");
    if (!journey) throw new Error("A RUNNING journey is required for telemetry");
    canonicalJourneyId = String(journey._id);
  }

  const recordedAt = input.recordedAt instanceof Date ? input.recordedAt : new Date(input.recordedAt);
  observeDuration("telemetry_capture_to_ingest_ms", Math.max(0, Date.now() - recordedAt.getTime()));

  const position = {
    organizationId, vehicleId: vehicle._id, journeyId: canonicalJourneyId,
    packetId: input.packetId || null, latitude: input.latitude, longitude: input.longitude,
    speedMps: input.speedMps || 0, heading: input.heading, accuracy: input.accuracy, recordedAt
  };

  if (input.packetId) {
    await RouteSessionPosition.updateOne({ organizationId, packetId: input.packetId }, { $setOnInsert: position }, { upsert: true });
  } else {
    await RouteSessionPosition.create(position);
  }

  const routeProgress=await calculateOperationalRouteProgress({
    organizationId,
    routeId:vehicle.routeId,
    latitude:input.latitude,
    longitude:input.longitude,
    speedMps:input.speedMps||0,
    recordedAt,
    previous:vehicle.activeRouteProgress
  });
  const freshness=getGpsFreshness(recordedAt);
  const existingRecordedAt = vehicle.lastLocation?.recordedAt ? new Date(vehicle.lastLocation.recordedAt) : null;

  if (!existingRecordedAt || recordedAt >= existingRecordedAt) {
    await Vehicle.updateOne(
      { _id: vehicle._id, organizationId },
      { $set: {
        status:"running",
        lastFreshness:freshness,
        activeRouteProgress:routeProgress,
        lastLocation:{latitude:input.latitude,longitude:input.longitude,speedMps:input.speedMps||0,heading:input.heading,accuracy:input.accuracy,recordedAt}
      }}
    );
    vehicle.lastFreshness=freshness;
    vehicle.activeRouteProgress=routeProgress;
    vehicle.lastLocation={latitude:input.latitude,longitude:input.longitude,speedMps:input.speedMps||0,heading:input.heading,accuracy:input.accuracy,recordedAt} as any;
  }

  return vehicleToSnapshot(vehicle, canonicalJourneyId);
}

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
