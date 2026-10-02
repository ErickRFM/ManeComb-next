import { TelemetrySchema, type TelemetryInput, type OperationalUnitSnapshot } from "@/src/core/contracts/telemetry";
import { getGpsFreshness } from "@/src/core/domain/gps-freshness";
import { observeDuration,incrementMetric } from "@/src/lib/metrics";
import { Vehicle } from "@/src/core/models/Vehicle";
import { Journey } from "@/src/core/models/Journey";
import { persistTelemetryPosition,finalizeTelemetryPosition } from "./deduplication";
import { calculateOperationalRouteProgress } from "@/src/core/services/route-projection";
import { vehicleToSnapshot } from "./freshness";
import { resolveTemporalAuthority } from "./temporal";
import { classifyOrdering,isValidCanonicalTime } from "./ordering";
import type { TelemetryContext } from "./contracts";
import { canonicalizeGps } from "./stabilization";

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
  const initialAnchor=isValidCanonicalTime(vehicle.lastLocation?.recordedAt,receivedAt)?vehicle.lastLocation:null;
  const initialQuality=temporal.liveEligible?canonicalizeGps({...input,recordedAt:temporal.canonicalRecordedAt},initialAnchor,vehicle.telemetryQuality?.candidate):undefined;
  const historyDecision=initialQuality&&!initialQuality.liveEligible?{...temporal,classification:"historical_only" as const,reason:initialQuality.reason}:temporal;
  const persisted=await persistTelemetryPosition(organizationId,vehicle._id,canonicalJourneyId,input,timed,historyDecision,receivedAt,initialQuality);
  input=persisted.input;
  if(persisted.duplicate&&persisted.applicationStatus&&persisted.applicationStatus!=="PENDING"){
    const current=await Vehicle.findOne(vehicleQuery,null,{lean:true});
    if(!current)throw new Error("Vehicle no longer exists");
    incrementMetric("telemetry_packets_total",1,{classification:"duplicate"});
    return vehicleToSnapshot(current,canonicalJourneyId);
  }
  const decision=classifyOrdering(persisted.decision,vehicle.lastLocation?.recordedAt);
  const recordedAt=decision.canonicalRecordedAt;
  const confirmAppliedDuplicate=async(current:any)=>{
    if(!persisted.duplicate||current.telemetryQuality?.appliedPacketId!==persisted.packetId||!isValidCanonicalTime(current.lastLocation?.recordedAt,receivedAt)||new Date(current.lastLocation.recordedAt).getTime()!==recordedAt.getTime())return false;
    const confirmed={...canonicalizeGps({...input,recordedAt},current.lastLocation),position:current.lastLocation,
      reason:current.telemetryQuality?.reason??"canonical_confirmed",stabilized:Boolean(current.telemetryQuality?.stabilized)};
    await finalizeTelemetryPosition(organizationId,persisted.packetId,timed,"live_eligible",confirmed.reason,"APPLIED",confirmed);
    return true;
  };
  incrementMetric("telemetry_packets_total",1,{classification:persisted.duplicate?"duplicate":decision.classification});
  if(persisted.duplicate){
    const current=await Vehicle.findOne(vehicleQuery,null,{lean:true});
    if(!current)throw new Error("Vehicle no longer exists");
    if(await confirmAppliedDuplicate(current))return vehicleToSnapshot(current,canonicalJourneyId);
  }
  if(!decision.liveEligible){
    await finalizeTelemetryPosition(organizationId,persisted.packetId,timed,decision.classification,decision.reason,decision.classification==="out_of_order"?"SUPERSEDED":"HISTORICAL_ONLY");
    const current=await Vehicle.findOne({_id:vehicle._id,organizationId},null,{lean:true});
    if(!current)throw new Error("Vehicle no longer exists");
    return vehicleToSnapshot(current,canonicalJourneyId);
  }

  let current=vehicle;
  for(let attempt=0;attempt<3;attempt++){
    if(await confirmAppliedDuplicate(current))return vehicleToSnapshot(current,canonicalJourneyId);
    if(!classifyOrdering(decision,current.lastLocation?.recordedAt).liveEligible){
      await finalizeTelemetryPosition(organizationId,persisted.packetId,timed,"out_of_order","older_than_canonical","SUPERSEDED");
      return vehicleToSnapshot(current,canonicalJourneyId);
    }
    const anchor=isValidCanonicalTime(current.lastLocation?.recordedAt,receivedAt)?current.lastLocation:null;
    const quality=canonicalizeGps({...input,recordedAt},anchor,current.telemetryQuality?.candidate);
    const filter:Record<string,unknown>={...vehicleQuery,"lastLocation.recordedAt":current.lastLocation?.recordedAt??null};
    if(!quality.liveEligible){
      incrementMetric("telemetry_quality_total",1,{reason:quality.reason});
      if(!quality.candidate){
        await finalizeTelemetryPosition(organizationId,persisted.packetId,timed,"historical_only",quality.reason,"HISTORICAL_ONLY",quality);
        return vehicleToSnapshot(current,canonicalJourneyId);
      }
      filter.$or=[{"telemetryQuality.candidate.recordedAt":null},{"telemetryQuality.candidate.recordedAt":{$lte:recordedAt}}];
      const held=await timed("vehicle_quality",()=>Vehicle.findOneAndUpdate(filter,{$set:{"telemetryQuality.candidate":quality.candidate}},{new:true,lean:true}));
      if(held){
        await finalizeTelemetryPosition(organizationId,persisted.packetId,timed,"historical_only",quality.reason,"HISTORICAL_ONLY",quality);
        return vehicleToSnapshot(held,canonicalJourneyId);
      }
    }else{
      const canonicalPosition=quality.position;
      const routeProgress=await calculateOperationalRouteProgress({organizationId,routeId:current.routeId,...canonicalPosition,previous:anchor?current.activeRouteProgress:undefined});
      const updated=await timed("vehicle_update",()=>Vehicle.findOneAndUpdate(filter,{$set:{
        status:"running",lastFreshness:getGpsFreshness(recordedAt),activeRouteProgress:routeProgress,
        lastLocation:canonicalPosition,telemetryQuality:{appliedPacketId:persisted.packetId,candidate:null,level:quality.quality,reason:quality.reason,stabilized:quality.stabilized}
      }},{new:true,lean:true}));
      if(updated){
        await finalizeTelemetryPosition(organizationId,persisted.packetId,timed,"live_eligible",quality.reason,"APPLIED",quality);
        return vehicleToSnapshot(updated,canonicalJourneyId);
      }
    }
    // Re-evaluate against the winning canonical anchor; never apply stale stabilization/projection.
    current=await Vehicle.findOne(vehicleQuery,null,{lean:true});
    if(!current)throw new Error("Vehicle no longer exists");
  }
  incrementMetric("telemetry_canonical_contention_total");
  if(await confirmAppliedDuplicate(current))return vehicleToSnapshot(current,canonicalJourneyId);
  if(current.lastLocation?.recordedAt&&new Date(current.lastLocation.recordedAt).getTime()>=recordedAt.getTime()){
    await finalizeTelemetryPosition(organizationId,persisted.packetId,timed,"out_of_order","superseded_during_contention","SUPERSEDED");
    return vehicleToSnapshot(current,canonicalJourneyId);
  }
  throw new Error("TELEMETRY_CANONICAL_RETRY");
}

