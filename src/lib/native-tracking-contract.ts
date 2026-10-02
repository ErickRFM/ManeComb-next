export const NATIVE_TRACKING_CONTRACT_VERSION=3;

export type NativeTrackingState=
  |"created"
  |"starting"
  |"running"
  |"offline"
  |"retry_wait"
  |"auth_failed"
  |"secure_store_error"
  |"permission_error"
  |"invalid_config"
  |"stopped";

export type NativeLocationStatus={
  contractVersion:number;
  state:NativeTrackingState|string;
  running:boolean;
  pendingPackets:number;
  networkAvailable:boolean;
  lastCaptureAtMs:number;
  lastUploadAtMs:number;
  retryDelayMs:number;
  lastError:string;
};

export function nativeTrackingStatusText(status:NativeLocationStatus){
  if(status.state==="auth_failed")return "Sesión GPS vencida · reanuda el seguimiento";
  if(status.state==="permission_error")return "Permiso de ubicación requerido";
  if(status.state==="secure_store_error")return "No se pudo proteger la sesión GPS";
  if(status.state==="invalid_config")return "Configuración GPS incompleta";
  if(status.state==="offline")return "GPS activo sin red · "+status.pendingPackets+" pendientes";
  if(status.state==="retry_wait")return "GPS activo · reintentando "+status.pendingPackets+" pendientes";
  if(status.running){
    return "GPS nativo en segundo plano"+(status.pendingPackets?" · "+status.pendingPackets+" pendientes":"");
  }
  return "Detenido";
}

export function nativeTrackingNetworkText(status:NativeLocationStatus){
  return status.networkAvailable?"Conectado":"Sin red";
}
