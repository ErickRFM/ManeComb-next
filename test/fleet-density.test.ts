import { describe, expect, it } from "vitest";
import { FLEET_CLUSTER_THRESHOLD, fleetToGeoJson, shouldClusterFleet } from "@/src/lib/fleet-density";
import type { OperationalUnitSnapshot } from "@/src/core/contracts/telemetry";

function unit(index:number):OperationalUnitSnapshot{
  return {
    vehicleId:"v"+index,
    economicNumber:"C-"+index,
    status:"running",
    driverId:null,
    routeId:null,
    journeyId:null,
    latitude:19.3+index*0.0001,
    longitude:-98.2-index*0.0001,
    speedKmH:20,
    heading:null,
    recordedAt:new Date().toISOString(),
    freshness:"live",
    routeName:null,
    progressPercent:null,
    distanceFromRouteM:null,
    distanceRemainingM:null,
    isOffRoute:false,
    routeState:null,
    etaMinutes:null,
    etaAt:null,
    nextStop:null
  };
}

describe("fleet density strategy",()=>{
  it("keeps small fleets on direct markers",()=>{
    expect(shouldClusterFleet(0)).toBe(false);
    expect(shouldClusterFleet(1)).toBe(false);
    expect(shouldClusterFleet(20)).toBe(false);
    expect(shouldClusterFleet(FLEET_CLUSTER_THRESHOLD-1)).toBe(false);
  });

  it("clusters at 100 and 500 visible units",()=>{
    expect(shouldClusterFleet(100)).toBe(true);
    expect(shouldClusterFleet(500)).toBe(true);
  });

  it("builds a GeoJSON feature per located unit",()=>{
    const collection=fleetToGeoJson(Array.from({length:500},(_,index)=>unit(index)));
    expect(collection.features).toHaveLength(500);
    expect(collection.features[0].properties.vehicleId).toBe("v0");
    expect(collection.features[499].geometry.coordinates).toHaveLength(2);
  });

  it("does not expose units without coordinates to the map source",()=>{
    const missing={...unit(1),latitude:null,longitude:null};
    expect(fleetToGeoJson([unit(0),missing]).features).toHaveLength(1);
  });
});
