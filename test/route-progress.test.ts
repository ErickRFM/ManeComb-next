import { describe, expect, it } from "vitest";
import { projectPointOnRoute, resolveRouteState, ROUTE_CORRIDOR } from "@/src/core/domain/route-progress";

describe("route projection",()=>{
  const geometry=[
    {latitude:19.30,longitude:-98.20},
    {latitude:19.31,longitude:-98.20},
    {latitude:19.32,longitude:-98.20}
  ];

  it("projects a point and returns bounded progress",()=>{
    const projection=projectPointOnRoute({latitude:19.315,longitude:-98.20},geometry);
    expect(projection).not.toBeNull();
    expect(projection!.progressPercent).toBeGreaterThan(40);
    expect(projection!.progressPercent).toBeLessThan(90);
    expect(projection!.distanceFromRouteM).toBeLessThan(5);
    expect(projection!.distanceRemainingM).toBeGreaterThan(0);
  });

  it("confirms hard deviation immediately",()=>{
    const state=resolveRouteState({
      distanceFromRouteM:ROUTE_CORRIDOR.hardDeviationMeters+10,
      now:new Date("2026-09-29T12:00:00Z")
    });
    expect(state.routeState).toBe("OFF_ROUTE_CONFIRMED");
  });

  it("uses time hysteresis before confirming an ambiguous deviation",()=>{
    const started="2026-09-29T12:00:00.000Z";
    const early=resolveRouteState({
      distanceFromRouteM:ROUTE_CORRIDOR.possibleDeviationMeters+20,
      previous:{routeState:"POSSIBLE_DEVIATION",deviationStartedAt:started},
      now:new Date("2026-09-29T12:00:20Z")
    });
    expect(early.routeState).toBe("POSSIBLE_DEVIATION");

    const confirmed=resolveRouteState({
      distanceFromRouteM:ROUTE_CORRIDOR.possibleDeviationMeters+20,
      previous:{routeState:"POSSIBLE_DEVIATION",deviationStartedAt:started},
      now:new Date("2026-09-29T12:00:50Z")
    });
    expect(confirmed.routeState).toBe("OFF_ROUTE_CONFIRMED");
  });

  it("marks recovery after returning to the route",()=>{
    const recovered=resolveRouteState({
      distanceFromRouteM:20,
      previous:{routeState:"OFF_ROUTE_CONFIRMED",deviationStartedAt:"2026-09-29T11:59:00Z"},
      now:new Date("2026-09-29T12:00:00Z")
    });
    expect(recovered.routeState).toBe("RECOVERING");
    expect(recovered.deviationStartedAt).toBeNull();
  });
});
