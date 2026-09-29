"use client";
import { useEffect, useRef, useState } from "react";
import { isNativeLocationAvailable, startNativeLocation, stopNativeLocation } from "@/src/lib/native-location";

export function DriverConsole() {
  const watchRef = useRef<number | null>(null);
  const wakeLockRef = useRef<any>(null);
  const [vehicleId, setVehicleId] = useState("");
  const [journeyId, setJourneyId] = useState("");
  const [status, setStatus] = useState("Detenido");
  const [speed, setSpeed] = useState<number | null>(null);

  useEffect(() => {
    const enrolled = localStorage.getItem("manecomb.vehicleId");
    if (enrolled) setVehicleId(enrolled);
  }, []);

  async function send(position: GeolocationPosition) {
    const payload = {
      vehicleId,
      journeyId: journeyId || undefined,
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      speedMps: Math.max(0, position.coords.speed || 0),
      heading: position.coords.heading ?? undefined,
      accuracy: position.coords.accuracy,
      recordedAt: new Date(position.timestamp).toISOString()
    };
    setSpeed(payload.speedMps * 3.6);
    const response = await fetch("/api/locations/telemetry", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!response.ok) setStatus("Telemetría rechazada por el servidor");
  }

  async function start() {
    if (!vehicleId) return setStatus("Ingresa el ID de la unidad");
    localStorage.setItem("manecomb.vehicleId", vehicleId);
    if (isNativeLocationAvailable()) {
      await startNativeLocation({ serverUrl: window.location.origin, vehicleId, journeyId: journeyId || undefined });
      setStatus("GPS nativo en segundo plano");
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
    setStatus("GPS web activo · mantén la pantalla encendida");
  }

  async function stop() {
    if (isNativeLocationAvailable()) await stopNativeLocation().catch(() => undefined);
    if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current);
    watchRef.current = null;
    await wakeLockRef.current?.release?.().catch(() => undefined);
    wakeLockRef.current = null;
    setStatus("Detenido");
  }

  return <div className="driver-panel grid">
    <div><span className="badge">OPERACIÓN</span><h1 className="module-title" style={{marginTop:12}}>Jornada del conductor</h1><p className="muted">PWA por defecto y servicio Android nativo dentro del wrapper para continuidad con pantalla bloqueada.</p></div>
    <div className="card grid">
      <input className="input" value={vehicleId} onChange={(e)=>setVehicleId(e.target.value)} placeholder="ID de unidad"/>
      <input className="input" value={journeyId} onChange={(e)=>setJourneyId(e.target.value)} placeholder="ID de jornada (opcional)"/>
      <div className="status-row"><span>Estado</span><strong>{status}</strong></div>
      {speed !== null ? <div className="status-row"><span>Velocidad</span><span className="kpi">{speed.toFixed(0)} km/h</span></div> : null}
      <div style={{display:"flex",gap:10}}><button className="btn" onClick={()=>void start()}>Iniciar GPS</button><button className="btn secondary" onClick={()=>void stop()}>Detener</button></div>
    </div>
  </div>;
}
