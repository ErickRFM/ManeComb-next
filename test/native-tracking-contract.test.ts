import { describe, expect, it } from "vitest";
import {describeNativeTracking,shouldStopNativeTracking,type NativeTrackingStatus} from "@/src/lib/native-tracking-contract";

const status=(overrides:Partial<NativeTrackingStatus>={}):NativeTrackingStatus=>({
  running:true,
  serviceState:"TRACKING",
  pendingPackets:0,
  networkState:"CONNECTED",
  lastCaptureAt:null,
  lastUploadAt:null,
  retryDelayMs:0,
  trackingVersion:"1.1",
  permissionState:"GRANTED",
  lastStopReason:null,
  ...overrides
});

describe("native tracking contract",()=>{
  it("describes offline and retry states without hiding queue depth",()=>{
    expect(describeNativeTracking(status({networkState:"DISCONNECTED",pendingPackets:3}))).toContain("3 pendientes");
    expect(describeNativeTracking(status({serviceState:"RETRYING",pendingPackets:8,retryDelayMs:5000}))).toContain("8 pendientes");
  });

  it("surfaces authorization loss separately from generic errors",()=>{
    expect(describeNativeTracking(status({running:false,serviceState:"AUTH_REQUIRED"}))).toContain("Sesión GPS vencida");
  });

  it.each([
    ["pause","PAUSED",true],
    ["finish","FINISHED",true],
    ["cancel","CANCELLED",true],
    ["start","RUNNING",false],
    ["resume","RUNNING",false],
    ["pause","RUNNING",false]
  ])("decides whether %s -> %s stops native tracking",(action,state,expected)=>{
    expect(shouldStopNativeTracking(action,state)).toBe(expected);
  });
});
