import {describe,expect,it} from "vitest";
import {nativeTrackingNetworkText,nativeTrackingStatusText,type NativeLocationStatus} from "@/src/lib/native-tracking-contract";

const status=(overrides:Partial<NativeLocationStatus>={}):NativeLocationStatus=>({
  contractVersion:2,
  state:"running",
  running:true,
  pendingPackets:0,
  networkAvailable:true,
  lastCaptureAtMs:0,
  lastUploadAtMs:0,
  retryDelayMs:0,
  lastError:"",
  ...overrides
});

describe("native tracking contract",()=>{
  it("describes healthy, offline and retry states",()=>{
    expect(nativeTrackingStatusText(status())).toBe("GPS nativo en segundo plano");
    expect(nativeTrackingStatusText(status({state:"offline",networkAvailable:false,pendingPackets:4}))).toContain("4 pendientes");
    expect(nativeTrackingStatusText(status({state:"retry_wait",pendingPackets:8}))).toContain("8 pendientes");
  });

  it("distinguishes authorization and permission failures",()=>{
    expect(nativeTrackingStatusText(status({state:"auth_failed",running:false}))).toContain("Sesión GPS vencida");
    expect(nativeTrackingStatusText(status({state:"permission_error",running:false}))).toContain("Permiso");
  });

  it("reports network state without guessing connectivity",()=>{
    expect(nativeTrackingNetworkText(status({networkAvailable:true}))).toBe("Conectado");
    expect(nativeTrackingNetworkText(status({networkAvailable:false}))).toBe("Sin red");
  });
});
