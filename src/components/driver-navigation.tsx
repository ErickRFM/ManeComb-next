"use client";
import { useCallback, useEffect,useRef, useState } from "react";
import { useSocket } from "@/src/hooks/useSocket";
import type { OperationalUnitSnapshot } from "@/src/core/contracts/telemetry";
import {mergeSnapshots} from "@/src/lib/fleet-snapshots";
import {distanceLabel,journeyStateLabel,orderedStops,routeStateLabel} from "./mobile-ui/journey-presentation";

export function DriverNavigation(){
  const socket=useSocket();
  const [data,setData]=useState<any>(null);
  const [state,setState]=useState("Cargando ruta...");
  const [error,setError]=useState("");const recent=useRef<OperationalUnitSnapshot[]>([]),loadId=useRef(0);

  const load=useCallback(async()=>{
    const id=++loadId.current,requestStart=recent.current;try{
    const response=await fetch("/api/operation/navigation");
    const body=await response.json();
    if(!response.ok)throw new Error(body.error||"No se pudo cargar navegación");
    if(id!==loadId.current)return;
    recent.current=mergeSnapshots(recent.current,body.snapshot?[body.snapshot]:[],requestStart).slice(-20);
    setData({...body,snapshot:recent.current.find(item=>item.vehicleId===body.journey?.vehicleId)||null});setError("");
    setState(body.journey?"Operación sincronizada":"Sin jornada asignada");
    }catch{if(id===loadId.current)setError("No se pudo cargar la ruta. Revisa tu conexión o tu acceso.")}
  },[]);

  useEffect(()=>{const refresh=()=>void load();refresh();socket.on("connect",refresh);socket.on("journey:update",refresh);return()=>{loadId.current++;socket.off("connect",refresh);socket.off("journey:update",refresh)}},[load,socket]);
  useEffect(()=>{
    const update=(snapshot:OperationalUnitSnapshot)=>{
      recent.current=mergeSnapshots(recent.current,[snapshot]).slice(-20);
      if(data?.journey?.vehicleId&&snapshot.vehicleId===data.journey.vehicleId){
        setData((current:any)=>current?{...current,snapshot:mergeSnapshots(current.snapshot?[current.snapshot]:[],[snapshot])[0]}:current);
      }
    };
    socket.on("location:snapshot",update);
    return()=>{socket.off("location:snapshot",update)}
  },[socket,data?.journey?.vehicleId]);

  if(!data?.journey)return <div className="card"><strong role="status">{error||state}</strong><p className="muted">La central debe asignar una jornada y ruta.</p><button className="btn secondary" onClick={()=>void load()}>Consultar ruta</button></div>;
  const snapshot:OperationalUnitSnapshot|null=data.snapshot;
  const route=data.route;

  return <div className="grid mobile-v3-route-context">
    {error?<p role="alert">{error} <button className="btn secondary" onClick={()=>void load()}>Consultar ruta</button></p>:null}
    <div className="card">
      <div className="status-row"><div><strong>{route?.name||"Sin ruta asignada"}</strong><p className="muted" style={{marginBottom:0}}>{route?.origin||"Origen no disponible"} → {route?.destination||"Destino no disponible"}</p>{route&&Number.isFinite(route.revision)?<small>Revisión {route.revision}</small>:null}</div><span className="badge">{journeyStateLabel(data.journey.state)}</span></div>
    </div>
    <div className="grid grid-3">
      <div className="card"><span className="muted">Avance</span><div className="kpi">{snapshot?.progressPercent==null?"—":snapshot.progressPercent.toFixed(1)+"%"}</div></div>
      <div className="card"><span className="muted">ETA</span><div className="kpi">{snapshot?.etaMinutes==null||!Number.isFinite(snapshot.etaMinutes)?"Sin estimación":snapshot.etaMinutes+" min"}</div></div>
      <div className="card"><span className="muted">Ruta</span><div className="kpi" style={{fontSize:20}}>{snapshot?.isOffRoute?"Fuera de ruta":routeStateLabel(snapshot?.routeState)}</div></div>
    </div>
    <div className="card">
      <strong>Próxima parada</strong>
      {snapshot?.nextStop?<><div className="kpi" style={{fontSize:26,marginTop:8}}>{snapshot.nextStop.name}</div><p className="muted">{distanceLabel(snapshot.nextStop.distanceRemainingM)} restantes</p></>:<p className="muted">Sin siguiente parada proyectada</p>}
    </div>
    <div className="card">
      <strong>Paradas de la ruta</strong>
      <div className="grid" style={{marginTop:12}}>{orderedStops<any>(route?.stops||[]).map((stop:any)=><div className="status-row mobile-v3-route-stop" key={stop.order+"-"+stop.name}><span aria-current={snapshot?.nextStop?.order===stop.order?"step":undefined}>{stop.order+1}. {stop.name}</span><span className="muted">{stop.radiusM==null||!Number.isFinite(stop.radiusM)?"Radio no disponible":distanceLabel(stop.radiusM)}</span></div>)}</div>
    </div>
  </div>
}
