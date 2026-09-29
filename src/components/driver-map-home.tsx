"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { OperationalUnitSnapshot } from "@/src/core/contracts/telemetry";
import { useSocket } from "@/src/hooks/useSocket";

type NavigationData={
  journey:null|{id:string;state:string;vehicleId:string;routeId:string|null;startedAt:string|null};
  route:null|{id:string;name:string;origin?:string|null;destination?:string|null;revision:number;geometry:Array<{latitude:number;longitude:number}>;stops:any[]};
  snapshot:OperationalUnitSnapshot|null;
};

export function DriverMapHome(){
  const socket=useSocket();
  const mapContainer=useRef<HTMLDivElement|null>(null);
  const mapRef=useRef<any>(null);
  const markerRef=useRef<any>(null);
  const [data,setData]=useState<NavigationData|null>(null);
  const [error,setError]=useState("");
  const [mapReady,setMapReady]=useState(false);
  const [follow,setFollow]=useState(true);

  useEffect(()=>{
    let mounted=true;
    fetch("/api/operation/navigation").then(async response=>{
      const body=await response.json();
      if(!response.ok)throw new Error(body.error||"No se pudo cargar la operación");
      if(mounted)setData(body);
    }).catch(e=>mounted&&setError(e.message));
    return()=>{mounted=false};
  },[]);

  useEffect(()=>{
    const update=(snapshot:OperationalUnitSnapshot)=>{
      setData(current=>{
        if(!current?.journey||current.journey.vehicleId!==snapshot.vehicleId)return current;
        return {...current,snapshot};
      });
    };
    socket.on("location:snapshot",update);
    return()=>{socket.off("location:snapshot",update)};
  },[socket]);

  useEffect(()=>{
    let disposed=false;
    void import("mapbox-gl").then(({default:mapboxgl})=>{
      if(disposed||!mapContainer.current||mapRef.current)return;
      const token=process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
      if(!token){setError("Falta Mapbox para mostrar la ruta.");return}
      mapboxgl.accessToken=token;
      const light=document.documentElement.dataset.theme==="light";
      const map=new mapboxgl.Map({
        container:mapContainer.current,
        style:light?"mapbox://styles/mapbox/navigation-day-v1":"mapbox://styles/mapbox/navigation-night-v1",
        center:[-98.2,19.3],
        zoom:14,
        attributionControl:false
      });
      map.addControl(new mapboxgl.NavigationControl({showCompass:true}),"bottom-right");
      map.on("dragstart",()=>setFollow(false));
      map.on("load",()=>setMapReady(true));
      mapRef.current=map;
    });
    return()=>{disposed=true;markerRef.current?.remove?.();markerRef.current=null;mapRef.current?.remove?.();mapRef.current=null};
  },[]);

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

  if(error)return <div className="driver-empty-state"><strong>No se pudo cargar la operación</strong><span>{error}</span></div>;
  if(!data)return <div className="driver-map-skeleton"/>;
  if(!data.journey)return <div className="driver-empty-state"><span className="brand-mark">MC</span><strong>Esperando jornada</strong><span>La central debe asignarte una unidad y ruta antes de comenzar.</span></div>;

  const snapshot=data.snapshot;
  const risk=snapshot?.isOffRoute||snapshot?.freshness==="lost"||snapshot?.freshness==="stale";

  return <section className="driver-command-center">
    <div className="driver-map-shell">
      <div ref={mapContainer} className="driver-map-canvas"/>
      <div className="driver-map-top">
        <div className="driver-route-chip">
          <span className={"unit-status-dot "+(risk?"danger":"good")}/>
          <div><strong>{data.route?.name||"Jornada activa"}</strong><small>{data.route?.origin||"Origen"} → {data.route?.destination||"Destino"}</small></div>
        </div>
        <button className={"driver-follow "+(follow?"active":"")} onClick={()=>setFollow(value=>!value)}>◎ {follow?"Siguiendo":"Seguir"}</button>
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
      <Link href="/operacion/navegacion" className="driver-action-card"><span>↗</span><strong>Ruta</strong><small>Paradas y avance</small></Link>
      <Link href="/operacion/chat" className="driver-action-card"><span>▤</span><strong>Chat</strong><small>Central de despacho</small></Link>
      <Link href="/operacion/radio" className="driver-action-card"><span>◉</span><strong>Radio</strong><small>PTT y llamadas</small></Link>
      <Link href="/operacion/sos" className="driver-action-card danger"><span>!</span><strong>SOS</strong><small>Emergencia</small></Link>
    </div>
  </section>;
}
