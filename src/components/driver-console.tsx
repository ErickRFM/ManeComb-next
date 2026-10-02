"use client";
import { useEffect, useRef, useState } from "react";
import {
  getNativeLocationStatus,
  isNativeLocationAvailable,
  listenNativeLocationStatus,
  startNativeLocation,
  stopNativeLocation
} from "@/src/lib/native-location";
import { describeNativeTracking, type NativeTrackingStatus } from "@/src/lib/native-tracking-contract";

export function DriverConsole() {
  const watchRef = useRef<number | null>(null);
  const wakeLockRef = useRef<any>(null);
  const trackingRef = useRef({ vehicleId: "", journeyId: "" });
  const [vehicleId, setVehicleId] = useState("");
  const [journeyId, setJourneyId] = useState("");
  const [status, setStatus] = useState("Detenido");
  const [nativeStatus,setNativeStatus]=useState<NativeTrackingStatus|null>(null);
  const [speed, setSpeed] = useState<number | null>(null);
  const [busy,setBusy]=useState(false);
  const [running,setRunning]=useState(false);

  useEffect(() => {
    const enrolled = localStorage.getItem("manecomb.vehicleId") || "";
    const activeJourney = localStorage.getItem("manecomb.journeyId") || "";
    setVehicleId(enrolled);
    setJourneyId(activeJourney);
    trackingRef.current = { vehicleId: enrolled, journeyId: activeJourney };
    let mounted=true;
    let listener:{remove:()=>Promise<void>}|null=null;

    if(isNativeLocationAvailable()){
      const apply=(result:NativeTrackingStatus)=>{
        if(!mounted)return;
        setNativeStatus(result);
        setRunning(result.running);
        setStatus(describeNativeTracking(result));
      };
      void getNativeLocationStatus().then(apply).catch(()=>mounted&&setStatus("No se pudo consultar el GPS nativo"));
      void listenNativeLocationStatus(apply).then(handle=>{if(mounted)listener=handle;else void handle.remove()}).catch(()=>undefined);
    }

    return()=>{
      mounted=false;
      if(listener)void listener.remove().catch(()=>undefined);
      if(watchRef.current!==null)navigator.geolocation.clearWatch(watchRef.current);
      void wakeLockRef.current?.release?.().catch(()=>undefined);
    };
  }, []);

  async function send(position: GeolocationPosition) {
    const current = trackingRef.current;
    const payload = {
      vehicleId: current.vehicleId,
      journeyId: current.journeyId || undefined,
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      speedMps: Math.max(0, position.coords.speed || 0),
      heading: position.coords.heading ?? undefined,
      accuracy: position.coords.accuracy,
      recordedAt: new Date(position.timestamp).toISOString()
    };
    setSpeed(payload.speedMps * 3.6);
    try{
      const response = await fetch("/api/locations/telemetry", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setStatus(data.error || "Telemetría rechazada por el servidor");
      }
    }catch{
      setStatus("GPS sin conexión. Esperando la siguiente actualización.");
    }
  }

  async function start() {
    if(watchRef.current!==null||running||busy)return;
    setBusy(true);
    try{
      const response=await fetch("/api/operation/navigation",{cache:"no-store"});
      if(!response.ok)throw new Error("No se pudo consultar la jornada actual");
      const current=await response.json();
      if(current.journey?.state!=="RUNNING")throw new Error("Inicia o reanuda la jornada antes de activar GPS.");
      const effectiveVehicleId = current.journey.vehicleId;
      const effectiveJourneyId = current.journey.id;

      setVehicleId(effectiveVehicleId);
      setJourneyId(effectiveJourneyId);
      trackingRef.current = { vehicleId: effectiveVehicleId, journeyId: effectiveJourneyId };
      localStorage.setItem("manecomb.vehicleId", effectiveVehicleId);
      localStorage.setItem("manecomb.journeyId", effectiveJourneyId);

      if (isNativeLocationAvailable()) {
        await startNativeLocation({ serverUrl: window.location.origin, vehicleId: effectiveVehicleId, journeyId: effectiveJourneyId });
        const currentStatus=await getNativeLocationStatus().catch(()=>null);
        if(currentStatus){
          setNativeStatus(currentStatus);
          setRunning(currentStatus.running);
          setStatus(describeNativeTracking(currentStatus));
        }else{
          setRunning(true);
          setStatus("GPS nativo en segundo plano");
        }
        return;
      }

      if ("wakeLock" in navigator) {
        try { wakeLockRef.current = await (navigator as any).wakeLock.request("screen"); } catch {}
      }
      watchRef.current = navigator.geolocation.watchPosition(
        (position) => void send(position),
        () => setStatus("Error de GPS o permisos"),
        { enableHighAccuracy: true, maximumAge: 3000, timeout: 15000 }
      );
      setRunning(true);
      setStatus("GPS web activo · mantén la pantalla encendida");
    }catch(error){
      setStatus(error instanceof Error?error.message:"No se pudo iniciar GPS. Vuelve a intentar.");
    }finally{
      setBusy(false);
    }
  }

  async function stop() {
    if(busy)return;
    setBusy(true);
    try{
      if (isNativeLocationAvailable()) await stopNativeLocation();
      if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current);
      watchRef.current = null;
      await wakeLockRef.current?.release?.().catch(()=>undefined);
      wakeLockRef.current = null;
      setStatus("Detenido");
      setRunning(false);
      setNativeStatus(current=>current?{...current,running:false,serviceState:"STOPPED",retryDelayMs:0}:current);
    }catch{
      setStatus("No se pudo confirmar la detención del GPS. Vuelve a intentar.");
    }finally{
      setBusy(false);
    }
  }

  return <div className="driver-panel grid">
    <div><span className="badge">TELEMETRÍA</span><h2 style={{margin:"10px 0 0"}}>Seguimiento GPS</h2><p className="muted">Inicia o reanuda tu jornada para transmitir la ubicación de la unidad asignada.</p></div>
    <div className="card grid">
      <label>Unidad asignada<input className="input" value={vehicleId} readOnly/></label>
      <label>Jornada activa<input className="input" value={journeyId} readOnly/></label>
      <div className="status-row"><span>Estado</span><strong role="status">{status}</strong></div>
      {nativeStatus?<>
        <div className="status-row"><span>Red</span><strong>{nativeStatus.networkState}</strong></div>
        <div className="status-row"><span>Cola local</span><strong>{nativeStatus.pendingPackets} pendientes</strong></div>
        <div className="status-row"><span>Motor</span><strong>{nativeStatus.trackingVersion}</strong></div>
      </>:null}
      {speed !== null ? <div className="status-row"><span>Velocidad</span><span className="kpi">{speed.toFixed(0)} km/h</span></div> : null}
      <div style={{display:"flex",gap:10}}>
        <button className="btn" disabled={busy||running} onClick={()=>void start()}>Iniciar GPS</button>
        <button className="btn secondary" disabled={busy||!running} onClick={()=>void stop()}>Detener</button>
      </div>
    </div>
  </div>;
}
