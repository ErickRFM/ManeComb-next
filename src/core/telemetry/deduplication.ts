import { randomUUID } from "node:crypto";
import { RouteSessionPosition } from "@/src/core/models/RouteSessionPosition";
import type { TelemetryInput } from "@/src/core/contracts/telemetry";
import type { DatabasePhase, TemporalDecision, TelemetryClassification } from "./contracts";
import { resolveTemporalAuthority } from "./temporal";
import type { CanonicalGpsDecision } from "./stabilization";

export async function persistTelemetryPosition(organizationId:string,vehicleId:unknown,journeyId:string|null,input:TelemetryInput,timed:DatabasePhase,decision:TemporalDecision,receivedAt:Date,quality?:CanonicalGpsDecision):Promise<{input:TelemetryInput;decision:TemporalDecision;duplicate:boolean;packetId:string;applicationStatus?:string}>{
  const position = {
    organizationId, vehicleId: vehicleId, journeyId: journeyId,
    packetId: input.packetId || randomUUID(), latitude: input.latitude, longitude: input.longitude,
    speedMps: input.speedMps || 0, heading: input.heading, accuracy: input.accuracy, recordedAt:input.recordedAt,
    receivedAt,canonicalRecordedAt:decision.canonicalRecordedAt,temporalEvidence:input.temporalEvidence,
    classification:decision.classification,decisionReason:decision.reason,applicationStatus:"PENDING",
    quality:quality?{level:quality.quality,reason:quality.reason,stabilized:quality.stabilized,proposedLatitude:quality.position.latitude,proposedLongitude:quality.position.longitude}:null
  };

  if (input.packetId) {
    const filter = { organizationId, packetId: input.packetId };
    const result = await timed<any>("position_upsert",()=>RouteSessionPosition.findOneAndUpdate(filter, { $setOnInsert: position }, { upsert: true, new: true, lean:true,includeResultMetadata:true })).catch(async (error: any) => {
      if(error?.code !== 11000)throw error;
      return {value:await RouteSessionPosition.findOne(filter,null,{lean:true}),lastErrorObject:{updatedExisting:true}};
    });
    const saved=result?.value;
    if(!saved || String(saved.vehicleId) !== String(vehicleId) || String(saved.journeyId || "") !== String(journeyId || "")) throw new Error("PACKET_ID_CONFLICT");
    // Replay acknowledges the originally stored packet, never forged replacement coordinates.
    input = {...input,latitude:saved.latitude,longitude:saved.longitude,speedMps:saved.speedMps,heading:saved.heading,accuracy:saved.accuracy,recordedAt:new Date(saved.recordedAt),temporalEvidence:saved.temporalEvidence||undefined};
    const duplicate=Boolean(result.lastErrorObject?.updatedExisting);
    if(duplicate){
      const authority=resolveTemporalAuthority({...input,recordedAt:new Date(saved.canonicalRecordedAt||saved.recordedAt),temporalEvidence:undefined},receivedAt);
      decision={...authority,classification:"duplicate",reason:"packet_replay",liveEligible:authority.liveEligible&&saved.classification!=="invalid_untrusted_time"&&saved.classification!=="out_of_order"};
    }
    return {input,decision,duplicate,packetId:saved.packetId,applicationStatus:saved.applicationStatus};
  } else {
    await RouteSessionPosition.create(position);
  }

  return {input,decision,duplicate:false,packetId:position.packetId,applicationStatus:"PENDING"};
}

export async function finalizeTelemetryPosition(organizationId:string,packetId:string,timed:DatabasePhase,classification:TelemetryClassification,reason:string,applicationStatus:"APPLIED"|"HISTORICAL_ONLY"|"SUPERSEDED",quality?:CanonicalGpsDecision){
  await timed("position_finalize",()=>RouteSessionPosition.updateOne({organizationId,packetId,applicationStatus:{$ne:"APPLIED"}},{$set:{
    classification,decisionReason:reason,applicationStatus,
    quality:quality?{level:quality.quality,reason:quality.reason,stabilized:quality.stabilized,canonicalLatitude:applicationStatus==="APPLIED"?quality.position.latitude:null,canonicalLongitude:applicationStatus==="APPLIED"?quality.position.longitude:null}:null
  }}));
}
