import { describe, expect, it } from "vitest";
import { getGpsFreshness } from "@/src/core/domain/gps-freshness";
describe("gps freshness",()=>{
  const now=new Date("2026-09-29T06:00:00.000Z");
  it("distinguishes live delayed stale lost and never",()=>{
    expect(getGpsFreshness(null,now)).toBe("never_reported");
    expect(getGpsFreshness(new Date(now.getTime()-5_000),now)).toBe("live");
    expect(getGpsFreshness(new Date(now.getTime()-30_000),now)).toBe("delayed");
    expect(getGpsFreshness(new Date(now.getTime()-90_000),now)).toBe("stale");
    expect(getGpsFreshness(new Date(now.getTime()-600_000),now)).toBe("lost");
  });
});
