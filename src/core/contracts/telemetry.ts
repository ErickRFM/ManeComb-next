import { z } from "zod";

export const NativeTelemetryClientSchema = z.object({
  platform: z.enum(["android","web"]).optional(),
  contractVersion: z.number().int().min(1).max(100).optional(),
  appVersionName: z.string().min(1).max(64).optional(),
  appVersionCode: z.number().int().min(0).max(2_147_483_647).optional(),
  queueDepth: z.number().int().min(0).max(20_000).optional(),
  networkAvailable: z.boolean().optional(),
  state: z.string().min(1).max(48).optional()
}).optional();

export const TemporalEvidenceSchema = z.object({
  capturedAt: z.coerce.date().optional(),
  queueAgeMs: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER).optional(),
  queueAgeSource: z.enum(["android_elapsed_realtime","device_wall_clock","unknown"]).optional(),
  capturedElapsedRealtimeMs: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER).optional(),
  sentElapsedRealtimeMs: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER).optional(),
  capturedBootCount: z.number().int().min(0).optional(),
  bootCount: z.number().int().min(0).optional()
});

export const TelemetrySchema = z.object({
  packetId: z.string().uuid().optional(),
  vehicleId: z.string().min(1),
  journeyId: z.string().min(1).optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  speedMps: z.number().min(0).max(120).optional().default(0),
  heading: z.number().min(0).max(360).optional(),
  accuracy: z.number().min(0).max(5000).optional(),
  recordedAt: z.coerce.date().default(() => new Date()),
  client: NativeTelemetryClientSchema,
  temporalEvidence: TemporalEvidenceSchema.optional()
});
export type TelemetryInput = z.infer<typeof TelemetrySchema>;
export type NativeTelemetryClient = NonNullable<TelemetryInput["client"]>;

export const GpsFreshnessSchema = z.enum(["live", "delayed", "stale", "lost", "never_reported"]);
export type GpsFreshness = z.infer<typeof GpsFreshnessSchema>;

export type DeviceDiagnostics = {
  platform: string | null;
  contractVersion: number | null;
  appVersionName: string | null;
  appVersionCode: number | null;
  queueDepth: number | null;
  networkAvailable: boolean | null;
  state: string | null;
  lastSeenAt: string | null;
};

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
  deviceDiagnostics?: DeviceDiagnostics | null;
};
