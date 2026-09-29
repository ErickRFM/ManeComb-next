"use client";
import { useEffect, useRef, useState } from "react";
import { isNativeLocationAvailable, startNativeLocation, stopNativeLocation } from "@/src/lib/native-location";

export function DriverConsole() {
  const watchRef = useRef<number | null>(null);
  const wakeLockRef = useRef<any>(null);
  const trackingRef = useRef({ vehicleId: "", journeyId: "" });
  const [vehicleId, setVehicleId] = useState("");
  const [journeyId, setJourneyId] = useState("");
  const [status, setStatus] = useState("Detenido");
  const [speed, setSpeed] = useState<number | null>(null);

  useEffect(() => {
    const enrolled = localStorage.getItem("manecomb.vehicleId") || "";
    const activeJourney = localStorage.getItem("manecomb.journeyId") || "";
    setVehicleId(enrolled);
    setJourneyId(activeJourney);
    trackingRef.current = { vehicleId: enrolled, journeyId: activeJourney };
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
    const response = await fetch("/api/locations/telemetry", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setStatus(data.error || "Telemetría rechazada por el servidor");
    }
  }

  async function start() {
    const effectiveVehicleId = vehicleId || localStorage.getItem("manecomb.vehicleId") || "";
    const effectiveJourneyId = journeyId || localStorage.getItem("manecomb.journeyId") || "";
    if (!effectiveVehicleId) return setStatus("No hay unidad asignada");
    if (!effectiveJourneyId) return setStatus("No hay jornada activa");

    setVehicleId(effectiveVehicleId);
    setJourneyId(effectiveJourneyId);
    trackingRef.current = { vehicleId: effectiveVehicleId, journeyId: effectiveJourneyId };
    localStorage.setItem("manecomb.vehicleId", effectiveVehicleId);
    localStorage.setItem("manecomb.journeyId", effectiveJourneyId);

    if (isNativeLocationAvailable()) {
      await startNativeLocation({ serverUrl: window.location.origin, vehicleId: effectiveVehicleId, journeyId: effectiveJourneyId });
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
    <div><span className="badge">TELEMETRÍA</span><h2 style={{margin:"10px 0 0"}}>Seguimiento GPS</h2><p className="muted">El servidor sólo acepta ubicación de la unidad asignada durante una jornada RUNNING.</p></div>
    <div className="card grid">
      <input className="input" value={vehicleId} readOnly placeholder="Unidad asignada"/>
      <input className="input" value={journeyId} readOnly placeholder="Jornada activa"/>
      <div className="status-row"><span>Estado</span><strong>{status}</strong></div>
      {speed !== null ? <div className="status-row"><span>Velocidad</span><span className="kpi">{speed.toFixed(0)} km/h</span></div> : null}
      <div style={{display:"flex",gap:10}}><button className="btn" onClick={()=>void start()}>Iniciar GPS</button><button className="btn secondary" onClick={()=>void stop()}>Detener</button></div>
    </div>
  </div>;
}
