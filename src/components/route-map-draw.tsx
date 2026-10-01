"use client";

import { useEffect, useRef, useState } from "react";

type Point={latitude:number;longitude:number};
type Stop={name:string;order:number;latitude:number;longitude:number;radiusM:number};

export function RouteMapDraw({points,stops=[],onChange,readOnly=false}:{points:Point[];stops?:Stop[];onChange:(points:Point[])=>void;readOnly?:boolean}){
  const containerRef=useRef<HTMLDivElement|null>(null);
  const mapRef=useRef<any>(null);
  const pointsRef=useRef(points);
  const stopsRef=useRef(stops);
  const onChangeRef=useRef(onChange);
  const readOnlyRef=useRef(readOnly);readOnlyRef.current=readOnly;
  const [latitude,setLatitude]=useState("");const [longitude,setLongitude]=useState("");const [error,setError]=useState("");

  useEffect(()=>{
    pointsRef.current=points;stopsRef.current=stops;onChangeRef.current=onChange;
    const map=mapRef.current;
    const routeSource=map?.getSource?.("route-draft");
    const stopSource=map?.getSource?.("route-stops");
    if(routeSource)routeSource.setData(toRouteGeoJson(points));
    if(stopSource)stopSource.setData(toStopsGeoJson(stops));
  },[points,stops,onChange]);

  useEffect(()=>{
    let disposed=false;
    void import("mapbox-gl").then(({default:mapboxgl})=>{
      if(disposed||!containerRef.current||mapRef.current)return;
      const token=process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
      if(!token)return;
      mapboxgl.accessToken=token;
      const light=document.documentElement.dataset.theme==="light";
      const map=new mapboxgl.Map({
        container:containerRef.current,
        style:light?"mapbox://styles/mapbox/light-v11":"mapbox://styles/mapbox/dark-v11",
        center:[-98.2,19.3],
        zoom:11,
        attributionControl:false
      });
      map.addControl(new mapboxgl.NavigationControl({showCompass:false}),"bottom-right");
      mapRef.current=map;
      map.on("error",()=>{if(!disposed)setError("No se pudo cargar el mapa. Puedes editar puntos por coordenadas.")});

      map.on("load",()=>{
        map.addSource("route-draft",{type:"geojson",data:toRouteGeoJson(pointsRef.current)});
        map.addLayer({id:"route-draft-line",type:"line",source:"route-draft",filter:["==",["get","kind"],"line"],paint:{"line-color":"#e11d48","line-width":5,"line-opacity":.95}});
        map.addLayer({id:"route-draft-points",type:"circle",source:"route-draft",filter:["==",["get","kind"],"point"],paint:{"circle-color":"#ffffff","circle-radius":5,"circle-stroke-color":"#e11d48","circle-stroke-width":2}});

        map.addSource("route-stops",{type:"geojson",data:toStopsGeoJson(stopsRef.current)});
        map.addLayer({id:"route-stop-circles",type:"circle",source:"route-stops",paint:{"circle-color":"#111318","circle-radius":11,"circle-stroke-color":"#ffffff","circle-stroke-width":2}});
        map.addLayer({id:"route-stop-labels",type:"symbol",source:"route-stops",layout:{"text-field":["to-string",["+",["get","order"],1]],"text-size":10},"paint":{"text-color":"#ffffff"}});
        fit(map,mapboxgl,pointsRef.current);
      });

      map.on("click",(event:any)=>{
        if(readOnlyRef.current)return;
        const next=[...pointsRef.current,{latitude:event.lngLat.lat,longitude:event.lngLat.lng}];
        pointsRef.current=next;
        onChangeRef.current(next);
      });
    }).catch(()=>{if(!disposed)setError("No se pudo cargar el mapa. Puedes editar puntos por coordenadas.")});
    return()=>{disposed=true;mapRef.current?.remove?.();mapRef.current=null};
  },[]);

  return <div className="route-map-editor">
    {!process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN?<p className="card muted" role="status">El mapa no está disponible. La geometría puede editarse por coordenadas.</p>:null}
    {process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN?<div ref={containerRef} className="route-map-canvas" role="region" aria-label="Mapa de edición de ruta"/>:null}
    <div className="route-map-toolbar">
      <div><strong>{points.length} puntos</strong><small>Haz clic sobre el mapa para extender la geometría.</small></div>
      {!readOnly?<div><button type="button" className="btn secondary" onClick={()=>onChange(points.slice(0,-1))} disabled={!points.length}>Deshacer</button><button type="button" className="btn secondary" onClick={()=>onChange([])} disabled={!points.length}>Limpiar</button></div>:null}
    </div>
    {!readOnly?<div className="route-coordinate-entry"><label>Latitud del punto<input className="input" type="number" min="-90" max="90" step="any" value={latitude} onChange={event=>setLatitude(event.target.value)}/></label><label>Longitud del punto<input className="input" type="number" min="-180" max="180" step="any" value={longitude} onChange={event=>setLongitude(event.target.value)}/></label><button type="button" className="btn secondary" onClick={()=>{
      const lat=Number(latitude),lng=Number(longitude);
      if(!latitude.trim()||!longitude.trim()||!Number.isFinite(lat)||!Number.isFinite(lng)||Math.abs(lat)>90||Math.abs(lng)>180){setError("Ingresa coordenadas válidas para añadir el punto.");return}
      onChange([...points,{latitude:lat,longitude:lng}]);setError("");setLatitude("");setLongitude("");
    }}>Añadir punto</button></div>:null}
    {error?<p role="alert">{error}</p>:null}
  </div>;
}

function toRouteGeoJson(points:Point[]){
  return {type:"FeatureCollection",features:[
    ...(points.length>=2?[{type:"Feature",properties:{kind:"line"},geometry:{type:"LineString",coordinates:points.map(point=>[point.longitude,point.latitude])}}]:[]),
    ...points.map((point,index)=>({type:"Feature",properties:{kind:"point",index},geometry:{type:"Point",coordinates:[point.longitude,point.latitude]}}))
  ]};
}

function toStopsGeoJson(stops:Stop[]){
  return {type:"FeatureCollection",features:stops.map(stop=>({
    type:"Feature",
    properties:{name:stop.name,order:stop.order,radiusM:stop.radiusM},
    geometry:{type:"Point",coordinates:[stop.longitude,stop.latitude]}
  }))};
}

function fit(map:any,mapboxgl:any,points:Point[]){
  if(points.length===1)map.easeTo({center:[points[0].longitude,points[0].latitude],zoom:14});
  if(points.length>1){
    const bounds=new mapboxgl.LngLatBounds();
    points.forEach(point=>bounds.extend([point.longitude,point.latitude]));
    map.fitBounds(bounds,{padding:60,maxZoom:15});
  }
}
