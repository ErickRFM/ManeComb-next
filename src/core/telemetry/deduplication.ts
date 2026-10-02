import { randomUUID } from "node:crypto";
import { RouteSessionPosition } from "@/src/core/models/RouteSessionPosition";
import type { TelemetryInput } from "@/src/core/contracts/telemetry";
import type { DatabasePhase } from "./contracts";

export async function persistTelemetryPosition(organizationId:string,vehicleId:unknown,journeyId:string|null,input:TelemetryInput,timed:DatabasePhase):Promise<TelemetryInput>{
  let recordedAt=input.recordedAt;
  const position = {
    organizationId, vehicleId: vehicleId, journeyId: journeyId,
    packetId: input.packetId || randomUUID(), latitude: input.latitude, longitude: input.longitude,
    speedMps: input.speedMps || 0, heading: input.heading, accuracy: input.accuracy, recordedAt
  };

  if (input.packetId) {
    const filter = { organizationId, packetId: input.packetId };
    const saved = await timed<any>("position_upsert",()=>RouteSessionPosition.findOneAndUpdate(filter, { $setOnInsert: position }, { upsert: true, new: true, lean:true })).catch(async (error: any) => {
      if(error?.code !== 11000)throw error;
      return RouteSessionPosition.findOne(filter,null,{lean:true});
    });
    if(!saved || String(saved.vehicleId) !== String(vehicleId) || String(saved.journeyId || "") !== String(journeyId || "")) throw new Error("PACKET_ID_CONFLICT");
    // Replay acknowledges the originally stored packet, never forged replacement coordinates.
    input = {...input,latitude:saved.latitude,longitude:saved.longitude,speedMps:saved.speedMps,heading:saved.heading,accuracy:saved.accuracy};
    recordedAt = new Date(saved.recordedAt);
  } else {
    await RouteSessionPosition.create(position);
  }

  return {...input,recordedAt};
}
