"use client";
import { useEffect, useRef, useState } from "react";
import type { OperationalUnitSnapshot } from "@/src/core/contracts/telemetry";
import { useSocket } from "@/src/hooks/useSocket";

export function LiveMap() {
  const container = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markers = useRef(new Map<string, any>());
  const socket = useSocket();
  const [units, setUnits] = useState<OperationalUnitSnapshot[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/locations/live").then(async (response) => {
      if (!response.ok) throw new Error("No se pudo cargar la flota");
      return response.json();
    }).then((data) => { if (!cancelled) setUnits(data.units || []); }).catch((err) => setError(err.message));
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const onSnapshot = (snapshot: OperationalUnitSnapshot) => {
      setUnits((current) => {
        const rest = current.filter((item) => item.vehicleId !== snapshot.vehicleId);
        return [...rest, snapshot];
      });
    };
    socket.on("location:snapshot", onSnapshot);
    return () => { socket.off("location:snapshot", onSnapshot); };
  }, [socket]);

  useEffect(() => {
    let disposed = false;
    void import("mapbox-gl").then((module) => {
      if (disposed || !container.current || mapRef.current) return;
      const mapboxgl = module.default;
      const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
      if (!token) { setError("Falta NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN"); return; }
      mapboxgl.accessToken = token;
      mapRef.current = new mapboxgl.Map({
        container: container.current,
        style: "mapbox://styles/mapbox/dark-v11",
        center: [-98.2, 19.3],
        zoom: 10
      });
    });
    return () => {
      disposed = true;
      mapRef.current?.remove?.();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    void import("mapbox-gl").then(({ default: mapboxgl }) => {
      const withLocation = units.filter((unit) => unit.latitude !== null && unit.longitude !== null);
      for (const unit of withLocation) {
        const lngLat:[number,number] = [unit.longitude as number, unit.latitude as number];
        let marker = markers.current.get(unit.vehicleId);
        if (!marker) {
          const el = document.createElement("button");
          el.type = "button";
          el.title = unit.economicNumber;
          el.style.cssText = "width:34px;height:34px;border-radius:50%;border:3px solid white;background:#e11d48;color:white;font-weight:800;box-shadow:0 6px 20px #0008;";
          el.textContent = unit.economicNumber.slice(-2);
          marker = new mapboxgl.Marker({ element: el }).setLngLat(lngLat).addTo(map);
          markers.current.set(unit.vehicleId, marker);
        } else marker.setLngLat(lngLat);
      }
      if (withLocation.length > 1) {
        const bounds = new mapboxgl.LngLatBounds();
        withLocation.forEach((unit) => bounds.extend([unit.longitude as number, unit.latitude as number]));
        map.fitBounds(bounds, { padding: 70, maxZoom: 15 });
      } else if (withLocation.length === 1) {
        map.easeTo({ center: [withLocation[0].longitude as number, withLocation[0].latitude as number], zoom: 14 });
      }
    });
  }, [units]);

  return <div className="grid">
    {error ? <div className="card" style={{color:"#fb7185"}}>{error}</div> : null}
    <div ref={container} className="map" />
    <div className="grid grid-3">
      {units.map((unit) => <div className="card" key={unit.vehicleId}>
        <div className="status-row"><strong>{unit.economicNumber}</strong><span className="badge">{unit.freshness}</span></div>
        <p className="muted">{unit.routeName||"Sin ruta"} · {unit.speedKmH.toFixed(1)} km/h</p>
        <div className="status-row"><span>Avance</span><strong>{unit.progressPercent==null?"—":unit.progressPercent.toFixed(1)+"%"}</strong></div>
        <div className="status-row"><span>ETA</span><strong>{unit.etaMinutes==null?"—":unit.etaMinutes+" min"}</strong></div>
        <div className="status-row"><span>Corredor</span><strong style={unit.isOffRoute?{color:"#fb7185"}:undefined}>{unit.isOffRoute?"FUERA DE RUTA":unit.routeState||"—"}</strong></div>
        {unit.nextStop?<p className="muted">Siguiente: {unit.nextStop.name} · {unit.nextStop.distanceRemainingM} m</p>:null}
      </div>)}
    </div>
  </div>;
}
