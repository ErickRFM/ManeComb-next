"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { OperationalUnitSnapshot } from "@/src/core/contracts/telemetry";
import { useSocket, useSocketStatus } from "@/src/hooks/useSocket";
import { mergeSnapshots } from "@/src/lib/fleet-snapshots";
import {Icon} from "@/src/components/ui/icon";

type NavigationData={
  journey:null|{id:string;state:string;vehicleId:string;routeId:string|null;startedAt:string|null};
  route:null|{id:string;name:string;origin?:string|null;destination?:string|null;revision:number;geometry:Array<{latitude:number;longitude:number}>;stops:any[]};
  snapshot:OperationalUnitSnapshot|null;
};

export function DriverMapHome(){
  const socket=useSocket();
  const connection=useSocketStatus(socket);
  const recent=useRef<OperationalUnitSnapshot[]>([]);
  const loadId=useRef(0);
  const mapContainer=useRef<HTMLDivElement|null>(null);
  const mapRef=useRef<any>(null);
  const markerRef=useRef<any>(null);
  const [data,setData]=useState<NavigationData|null>(null);
  const [error,setError]=useState("");
  const [mapError,setMapError]=useState("");
  const [retry,setRetry]=useState(0);
  const [mapReady,setMapReady]=useState(false);
  const [follow,setFollow]=useState(true);

  useEffect(()=>{
    let mounted=true;
    const refresh=()=>{const id=++loadId.current,requestStart=recent.current;void fetch("/api/operation/navigation",{cache:"no-store"}).then(async response=>{
      const body=await response.json();
      if(!response.ok)throw new Error(body.error||"No se pudo cargar la operación");
      if(mounted&&id===loadId.current){
        const snapshots=mergeSnapshots(recent.current,body.snapshot?[body.snapshot]:[],requestStart).slice(-20);recent.current=snapshots;
        setData({...body,snapshot:snapshots.find(item=>item.vehicleId===body.journey?.vehicleId)||null});setError("");
      }
    }).catch(()=>{if(mounted&&id===loadId.current)setError("No se pudo cargar la operación. Revisa tu conexión o tu acceso.")})};
    refresh();socket.on("connect",refresh);socket.on("journey:update",refresh);
    return()=>{mounted=false;socket.off("connect",refresh);socket.off("journey:update",refresh)};
  },[socket,retry]);

  useEffect(()=>{
    const update=(snapshot:OperationalUnitSnapshot)=>{
      recent.current=mergeSnapshots(recent.current,[snapshot]).slice(-20);
      setData(current=>{
        if(!current?.journey||current.journey.vehicleId!==snapshot.vehicleId)return current;
        return {...current,snapshot:mergeSnapshots(current.snapshot?[current.snapshot]:[],[snapshot])[0]};
      });
    };
    socket.on("location:snapshot",update);
    return()=>{socket.off("location:snapshot",update)};
  },[socket]);

  useEffect(()=>{
    let disposed=false;
    setMapReady(false);
    void import("mapbox-gl").then(({default:mapboxgl})=>{
      if(disposed||!mapContainer.current||mapRef.current)return;
      const token=process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
      if(!token){setMapError("El mapa no está disponible. Los datos de tu jornada siguen accesibles.");return}
      mapboxgl.accessToken=token;
      const light=document.documentElement.dataset.theme==="light";
      const map=new mapboxgl.Map({
        container:mapContainer.current,
        style:light?"mapbox://styles/mapbox/navigation-day-v1":"mapbox://styles/mapbox/navigation-night-v1",
        center:[-98.2,19.3],
        zoom:14,
        attributionControl:false
      });
      map.addControl(new mapboxgl.NavigationControl({showCompass:true}),"top-right");
      map.on("dragstart",()=>setFollow(false));
      map.on("load",()=>{setMapReady(true);setMapError("")});
      map.on("error",()=>{if(!disposed)setMapError("No se pudo cargar el mapa. Revisa tu conexión.")});
      mapRef.current=map;
    }).catch(()=>{if(!disposed)setMapError("No se pudo cargar el mapa. Los datos de tu jornada siguen accesibles.")});
    return()=>{disposed=true;markerRef.current?.remove?.();markerRef.current=null;mapRef.current?.remove?.();mapRef.current=null};
  },[data?.journey?.id]);

  useEffect(()=>{
    const map=mapRef.current;
    const route=data?.route;
    if(!map||!mapReady||!route?.geometry?.length)return;
    const coordinates=route.geometry.map(point=>[point.longitude,point.latitude]);
    const source={type:"Feature",properties:{},geometry:{type:"LineString",coordinates}} as any;
    const existing=map.getSource("manecomb-route") as any;
    if(existing)existing.setData(source);
    else{
      map.addSource("manecomb-route",{type:"geojson",data:source});
      map.addLayer({id:"manecomb-route-outline",type:"line",source:"manecomb-route",paint:{"line-color":"rgba(255,255,255,.72)","line-width":8,"line-opacity":.55}});
      map.addLayer({id:"manecomb-route-line",type:"line",source:"manecomb-route",paint:{"line-color":"#e11d48","line-width":5}});
    }
  },[data?.route,mapReady]);

  useEffect(()=>{
    const map=mapRef.current;
    const snapshot=data?.snapshot;
    if(!map||!mapReady||snapshot?.latitude==null||snapshot.longitude==null)return;
    void import("mapbox-gl").then(({default:mapboxgl})=>{
      if(!markerRef.current){
        const el=document.createElement("div");
        el.className="driver-live-marker";
        el.innerHTML="<span>MC</span>";
        markerRef.current=new mapboxgl.Marker({element:el}).setLngLat([snapshot.longitude as number,snapshot.latitude as number]).addTo(map);
      }else markerRef.current.setLngLat([snapshot.longitude,snapshot.latitude]);
      if(follow)map.easeTo({center:[snapshot.longitude,snapshot.latitude],zoom:15.5,bearing:snapshot.heading||0,duration:420});
    });
  },[data?.snapshot,mapReady,follow]);

  const routeProgress=useMemo(()=>{
    const value=data?.snapshot?.progressPercent;
    return value==null?0:Math.max(0,Math.min(100,value));
  },[data?.snapshot?.progressPercent]);

  if(error&&!data)return <div className="driver-empty-state" role="alert"><strong>No se pudo cargar la operación</strong><span>{error}</span><button className="btn" onClick={()=>setRetry(value=>value+1)}>Reintentar</button></div>;
  if(!data)return <div className="driver-map-skeleton" role="status" aria-label="Cargando operación"/>;
  if(!data.journey)return <div className="driver-empty-state"><span className="brand-mark">MC</span><strong>Esperando jornada</strong><span>La central debe asignarte una unidad y ruta antes de comenzar.</span></div>;

  const snapshot=data.snapshot;
  const risk=snapshot?.isOffRoute||snapshot?.freshness==="lost"||snapshot?.freshness==="stale";

  return <section className="driver-command-center">
    {error?<p role="alert">{error} <button className="btn secondary" onClick={()=>setRetry(value=>value+1)}>Reintentar</button></p>:null}
    {mapError?<p role="status">{mapError}</p>:null}
    <p role="status">{connection==="connected"?"En línea":connection==="connecting"?"Conectando…":"Reconectando. Se muestran los últimos datos recibidos."}</p>
    <div className="driver-map-shell">
      <div ref={mapContainer} className="driver-map-canvas"/>
      <div className="driver-map-top">
        <div className="driver-route-chip">
          <span className={"unit-status-dot "+(risk?"danger":"good")}/>
          <div><strong>{data.route?.name||"Jornada activa"}</strong><small>{data.route?.origin||"Origen"} → {data.route?.destination||"Destino"}</small></div>
        </div>
        <button className={"driver-follow "+(follow?"active":"")} onClick={()=>setFollow(value=>!value)}><Icon name="location"/> {follow?"Siguiendo":"Seguir"}</button>
      </div>

      <div className="driver-progress-track"><span style={{width:routeProgress+"%"}}/></div>

      <div className="driver-bottom-card">
        <div className="driver-next-stop">
          <span className="driver-card-label">PRÓXIMA PARADA</span>
          <strong>{snapshot?.nextStop?.name||"Ruta en curso"}</strong>
          <small>{snapshot?.nextStop?snapshot.nextStop.distanceRemainingM+" m restantes":snapshot?.routeState||"Sin proyección"}</small>
        </div>
        <div className="driver-live-kpis">
          <div><small>ETA</small><strong>{snapshot?.etaMinutes==null?"—":snapshot.etaMinutes+" min"}</strong></div>
          <div><small>Velocidad</small><strong>{snapshot?.speedKmH==null?"—":snapshot.speedKmH.toFixed(0)+" km/h"}</strong></div>
          <div><small>GPS</small><strong className={risk?"danger-text":""}>{snapshot?.freshness||"—"}</strong></div>
        </div>
      </div>

      {snapshot?.isOffRoute?<div className="driver-route-alert"><strong>Fuera de ruta</strong><span>{snapshot.distanceFromRouteM??0} m fuera del corredor autorizado.</span></div>:null}
    </div>

    <div className="driver-action-row">
      <Link href="/operacion/navegacion" className="driver-action-card"><Icon name="route"/><strong>Ruta</strong><small>Paradas y avance</small></Link>
      <Link href="/operacion/chat" className="driver-action-card"><Icon name="chat"/><strong>Chat</strong><small>Central de despacho</small></Link>
      <Link href="/operacion/radio" className="driver-action-card"><Icon name="radio"/><strong>Radio</strong><small>PTT y llamadas</small></Link>
      <Link href="/operacion/sos" className="driver-action-card danger"><Icon name="alert"/><strong>SOS</strong><small>Emergencia</small></Link>
    </div>
  </section>;
}
