import type { TelemetryInput, OperationalUnitSnapshot } from "@/src/core/contracts/telemetry";
import { getGpsFreshness } from "@/src/core/domain/gps-freshness";
import { Vehicle } from "@/src/core/models/Vehicle";
import { Journey } from "@/src/core/models/Journey";
import { RouteSessionPosition } from "@/src/core/models/RouteSessionPosition";

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
    const journeyQuery: Record<string, unknown> = {
      organizationId,
      vehicleId: vehicle._id,
      driverId: context.driverId,
      state: "RUNNING"
    };
    if (input.journeyId) journeyQuery._id = input.journeyId;
    const journey = await Journey.findOne(journeyQuery).select("_id");
    if (!journey) throw new Error("A RUNNING journey is required for telemetry");
    canonicalJourneyId = String(journey._id);
  }

  const recordedAt = input.recordedAt instanceof Date ? input.recordedAt : new Date(input.recordedAt);

  await Promise.all([
    RouteSessionPosition.create({
      organizationId,
      vehicleId: vehicle._id,
      journeyId: canonicalJourneyId,
      latitude: input.latitude,
      longitude: input.longitude,
      speedMps: input.speedMps || 0,
      heading: input.heading,
      accuracy: input.accuracy,
      recordedAt
    }),
    Vehicle.updateOne(
      { _id: vehicle._id, organizationId },
      {
        $set: {
          status: "running",
          lastLocation: {
            latitude: input.latitude,
            longitude: input.longitude,
            speedMps: input.speedMps || 0,
            heading: input.heading,
            accuracy: input.accuracy,
            recordedAt
          }
        }
      }
    )
  ]);

  return {
    vehicleId: String(vehicle._id),
    economicNumber: vehicle.economicNumber,
    status: "running",
    latitude: input.latitude,
    longitude: input.longitude,
    speedKmH: Math.round((input.speedMps || 0) * 3.6 * 10) / 10,
    heading: input.heading ?? null,
    recordedAt: recordedAt.toISOString(),
    freshness: getGpsFreshness(recordedAt)
  };
}

export function vehicleToSnapshot(vehicle: any): OperationalUnitSnapshot {
  const loc = vehicle.lastLocation;
  return {
    vehicleId: String(vehicle._id),
    economicNumber: vehicle.economicNumber,
    status: vehicle.status,
    latitude: loc?.latitude ?? null,
    longitude: loc?.longitude ?? null,
    speedKmH: Math.round((loc?.speedMps || 0) * 3.6 * 10) / 10,
    heading: loc?.heading ?? null,
    recordedAt: loc?.recordedAt ? new Date(loc.recordedAt).toISOString() : null,
    freshness: getGpsFreshness(loc?.recordedAt)
  };
}
