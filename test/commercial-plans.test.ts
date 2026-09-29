import { describe, expect, it } from "vitest";
import { COMMERCIAL_PLANS, getCommercialPlan } from "@/src/core/domain/commercial-plans";

describe("commercial plan catalog",()=>{
  it("uses one canonical fleet-* catalog",()=>{
    expect(COMMERCIAL_PLANS.map(plan=>plan.code)).toEqual([
      "fleet-2","fleet-4","fleet-6","fleet-8","fleet-12"
    ]);
    expect(COMMERCIAL_PLANS.map(plan=>plan.units)).toEqual([2,4,6,8,12]);
  });

  it("resolves by code or unit count only",()=>{
    expect(getCommercialPlan("fleet-6")?.monthlyMxn).toBe(289);
    expect(getCommercialPlan("8")?.code).toBe("fleet-8");
    expect(getCommercialPlan("starter")).toBeNull();
    expect(getCommercialPlan("enterprise")).toBeNull();
  });
});
