import { TelemetrySchema, type TelemetryInput, type OperationalUnitSnapshot } from "@/src/core/contracts/telemetry";
import { getGpsFreshness } from "@/src/core/domain/gps-freshness";
import { observeDuration,incrementMetric } from "@/src/lib/metrics";
import { Vehicle } from "@/src/core/models/Vehicle";
import { Journey } from "@/src/core/models/Journey";
import { persistTelemetryPosition } from "./deduplication";
import { calculateOperationalRouteProgress } from "@/src/core/services/route-projection";
import { vehicleToSnapshot } from "./freshness";
import { resolveTemporalAuthority } from "./temporal";
import { classifyOrdering } from "./ordering";
import type { TelemetryContext } from "./contracts";

async function timed<T>(phase:string,operation:()=>PromiseLike<T>):Promise<T>{
  const started=performance.now();
  try{return await operation()}finally{observeDuration("telemetry_database_phase_ms",performance.now()-started,{phase})}
}

export async function recordTelemetry(
  organizationId: string,
  input: TelemetryInput,
  context?: TelemetryContext
): Promise<OperationalUnitSnapshot> {
  const receivedAt=new Date();
  input=TelemetrySchema.parse(input);
  const vehicleQuery: Record<string, unknown> = { _id: input.vehicleId, organizationId };
  if (context?.driverId) vehicleQuery.driverId = context.driverId;
  const vehicle = await timed<any>("vehicle_read",()=>Vehicle.findOne(vehicleQuery,null,{lean:true}));
  if (!vehicle) throw new Error("Vehicle not assigned to authenticated driver");

  let canonicalJourneyId: string | null = input.journeyId || null;
  if (context?.driverId) {
    const journeyQuery: Record<string, unknown> = {organizationId,vehicleId:vehicle._id,driverId:context.driverId,state:"RUNNING"};
    if (input.journeyId) journeyQuery._id = input.journeyId;
    const journey = await timed<any>("journey_read",()=>Journey.findOne(journeyQuery,null,{lean:true}).select("_id"));
    if (!journey) throw new Error("A RUNNING journey is required for telemetry");
    canonicalJourneyId = String(journey._id);
  }

  const temporal=classifyOrdering(resolveTemporalAuthority(input,receivedAt,context),vehicle.lastLocation?.recordedAt);
  observeDuration("telemetry_capture_to_ingest_ms", Math.max(0, receivedAt.getTime() - temporal.canonicalRecordedAt.getTime()));
  const persisted=await persistTelemetryPosition(organizationId,vehicle._id,canonicalJourneyId,input,timed,temporal,receivedAt);
  input=persisted.input;
  const decision=classifyOrdering(persisted.decision,vehicle.lastLocation?.recordedAt);
  incrementMetric("telemetry_packets_total",1,{classification:persisted.duplicate?"duplicate":decision.classification});
  if(!decision.liveEligible){
    const current=await Vehicle.findOne({_id:vehicle._id,organizationId},null,{lean:true});
    if(!current)throw new Error("Vehicle no longer exists");
    return vehicleToSnapshot(current,canonicalJourneyId);
  }
  const recordedAt=decision.canonicalRecordedAt;

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
  const updated = await timed("vehicle_update",()=>Vehicle.findOneAndUpdate(
      { _id: vehicle._id, organizationId, ...(context?.driverId ? {driverId:context.driverId} : {}),
        $or:[{"lastLocation.recordedAt":null},{"lastLocation.recordedAt":{$lte:recordedAt}}] },
      { $set: {
        status:"running",
        lastFreshness:freshness,
        activeRouteProgress:routeProgress,
        lastLocation:{latitude:input.latitude,longitude:input.longitude,speedMps:input.speedMps||0,heading:input.heading,accuracy:input.accuracy,recordedAt}
      }}, {new:true,lean:true}
    ));
  const canonical = updated || await Vehicle.findOne({_id:vehicle._id,organizationId},null,{lean:true});
  if(!canonical)throw new Error("Vehicle no longer exists");
  return vehicleToSnapshot(canonical, canonicalJourneyId);
}

