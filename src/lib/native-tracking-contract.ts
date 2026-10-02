export const NATIVE_TRACKING_VERSION="1.1";

export type NativeTrackingServiceState=
  |"STOPPED"
  |"STARTING"
  |"TRACKING"
  |"RETRYING"
  |"AUTH_REQUIRED"
  |"ERROR";

export type NativeTrackingNetworkState="UNKNOWN"|"CONNECTED"|"LIMITED"|"DISCONNECTED";

export type NativeTrackingStatus={
  running:boolean;
  serviceState:NativeTrackingServiceState;
  pendingPackets:number;
  networkState:NativeTrackingNetworkState;
  lastCaptureAt:number|null;
  lastUploadAt:number|null;
  retryDelayMs:number;
  trackingVersion:string;
  permissionState:"GRANTED"|"DENIED";
  lastStopReason:string|null;
};

export function describeNativeTracking(status:NativeTrackingStatus){
  if(status.serviceState==="AUTH_REQUIRED")return "Sesión GPS vencida · abre ManeComb";
  if(status.serviceState==="RETRYING")return "GPS activo · reenviando "+status.pendingPackets+" pendientes";
  if(status.serviceState==="TRACKING"&&status.networkState==="DISCONNECTED")return "GPS activo sin red · "+status.pendingPackets+" pendientes";
  if(status.serviceState==="TRACKING")return status.pendingPackets?"GPS activo · "+status.pendingPackets+" pendientes":"GPS nativo en segundo plano";
  if(status.serviceState==="STARTING")return "Iniciando GPS nativo…";
  if(status.serviceState==="ERROR")return "GPS nativo requiere atención";
  return "Detenido";
}

export function shouldStopNativeTracking(action:string,state:string){
  return (action==="pause"&&state==="PAUSED") ||
    (action==="finish"&&state==="FINISHED") ||
    (action==="cancel"&&state==="CANCELLED");
}
