import type { TelemetryInput, OperationalUnitSnapshot } from "@/src/core/contracts/telemetry";
import { getGpsFreshness } from "@/src/core/domain/gps-freshness";
import { Vehicle } from "@/src/core/models/Vehicle";
import { RouteSessionPosition } from "@/src/core/models/RouteSessionPosition";

export async function recordTelemetry(organizationId: string, input: TelemetryInput): Promise<OperationalUnitSnapshot> {
  const vehicle = await Vehicle.findOne({ _id: input.vehicleId, organizationId });
  if (!vehicle) throw new Error("Vehicle not found for organization");

  const recordedAt = input.recordedAt instanceof Date ? input.recordedAt : new Date(input.recordedAt);

  await Promise.all([
    RouteSessionPosition.create({
      organizationId,
      vehicleId: vehicle._id,
      journeyId: input.journeyId || null,
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
