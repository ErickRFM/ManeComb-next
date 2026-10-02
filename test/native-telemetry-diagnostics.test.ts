import {describe,expect,it} from "vitest";
import {TelemetrySchema} from "@/src/core/contracts/telemetry";

const base={
  packetId:"11111111-1111-4111-8111-111111111111",
  vehicleId:"vehicle",
  journeyId:"journey",
  latitude:19.3,
  longitude:-98.2,
  recordedAt:"2026-10-01T12:00:00.000Z"
};

describe("native telemetry diagnostics",()=>{
  it("accepts bounded non-sensitive Android diagnostics",()=>{
    const parsed=TelemetrySchema.parse({...base,client:{
      platform:"android",
      trackingVersion:"1.1",
      appVersionName:"0.1.0-rc1",
      appVersionCode:1,
      queueDepth:7,
      networkState:"CONNECTED"
    }});
    expect(parsed.client?.queueDepth).toBe(7);
    expect(parsed.client?.trackingVersion).toBe("1.1");
  });

  it("rejects impossible queue depths and unknown network states",()=>{
    expect(()=>TelemetrySchema.parse({...base,client:{queueDepth:20001}})).toThrow();
    expect(()=>TelemetrySchema.parse({...base,client:{networkState:"MAGIC"}})).toThrow();
  });

  it("keeps client diagnostics optional for browser and legacy telemetry",()=>{
    expect(TelemetrySchema.parse(base).client).toBeUndefined();
  });
});
