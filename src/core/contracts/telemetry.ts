import { z } from "zod";

export const TelemetrySchema = z.object({
  packetId: z.string().uuid().optional(),
  vehicleId: z.string().min(1),
  journeyId: z.string().min(1).optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  speedMps: z.number().min(0).max(120).optional().default(0),
  heading: z.number().min(0).max(360).optional(),
  accuracy: z.number().min(0).max(5000).optional(),
  recordedAt: z.coerce.date().default(() => new Date())
});
export type TelemetryInput = z.infer<typeof TelemetrySchema>;

export const GpsFreshnessSchema = z.enum(["live", "delayed", "stale", "lost", "never_reported"]);
export type GpsFreshness = z.infer<typeof GpsFreshnessSchema>;

export type OperationalUnitSnapshot = {
  vehicleId: string;
  economicNumber: string;
  status: string;
  driverId: string | null;
  routeId: string | null;
  journeyId: string | null;
  latitude: number | null;
  longitude: number | null;
  speedKmH: number;
  heading: number | null;
  recordedAt: string | null;
  freshness: GpsFreshness;
  routeName: string | null;
  progressPercent: number | null;
  distanceFromRouteM: number | null;
  distanceRemainingM: number | null;
  isOffRoute: boolean;
  routeState: string | null;
  etaMinutes: number | null;
  etaAt: string | null;
  nextStop: {name:string;order:number;latitude:number;longitude:number;distanceRemainingM:number}|null;
};
