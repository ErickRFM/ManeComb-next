import type { GpsFreshness } from "@/src/core/contracts/telemetry";

export const GPS_FRESHNESS_MS = { live: 15_000, delayed: 45_000, stale: 120_000, lost: 300_000 } as const;

export function getGpsFreshness(recordedAt: Date | string | null | undefined, now = new Date()): GpsFreshness {
  if (!recordedAt) return "never_reported";
  const age = Math.max(0, now.getTime() - new Date(recordedAt).getTime());
  if (age <= GPS_FRESHNESS_MS.live) return "live";
  if (age <= GPS_FRESHNESS_MS.delayed) return "delayed";
  if (age <= GPS_FRESHNESS_MS.stale) return "stale";
  return "lost";
}
