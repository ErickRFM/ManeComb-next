import { expect,it } from "vitest";
import type { OperationalUnitSnapshot } from "@/src/core/contracts/telemetry";
import { mergeSnapshots,gpsStatusText } from "@/src/lib/fleet-snapshots";
const unit=(id:string,date:string|null,latitude=1)=>({vehicleId:id,recordedAt:date,latitude} as OperationalUnitSnapshot);
it("keeps newer realtime GPS when the initial HTTP snapshot finishes later",()=>{
  const live=unit("a","2026-09-30T12:00:03Z",2);
  expect(mergeSnapshots([live],[unit("a","2026-09-30T12:00:00Z")])[0]).toBe(live);
});
it("updates equal-time freshness and merges independent vehicles without duplicating them",()=>{
  const older=unit("a",null);const fresh=unit("a","2026-09-30T12:00:00Z");
  expect(mergeSnapshots([older],[fresh,unit("b",null)])).toEqual([fresh,unit("b",null)]);
  expect(mergeSnapshots([fresh],[{...fresh,freshness:"lost"}])[0].freshness).toBe("lost");
});
it("does not describe zero reporting units as stable telemetry",()=>{
  expect(gpsStatusText(0,0)).toBe("Sin unidades reportando");
  expect(gpsStatusText(2,1)).toBe("1 requieren atención");
  expect(gpsStatusText(2,0)).toBe("Telemetría estable");
});
it("keeps a sweeper freshness update received while HTTP was in flight",()=>{
  const live={...unit("a","2026-09-30T12:00:00Z"),freshness:"live" as const};
  const lost={...live,freshness:"lost" as const};
  expect(mergeSnapshots([lost],[live],[live])[0]).toBe(lost);
});
it("accepts fresh HTTP state over equal-time realtime cached before the request",()=>{
  const live={...unit("a","2026-09-30T12:00:00Z"),freshness:"live" as const};
  const lost={...live,freshness:"lost" as const};
  expect(mergeSnapshots([live],[lost],[live])[0]).toBe(lost);
});
