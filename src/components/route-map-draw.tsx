"use client";
import { useEffect, useRef } from "react";

type Point={latitude:number;longitude:number};

export function RouteMapDraw({points,onChange}:{points:Point[];onChange:(points:Point[])=>void}){
  const containerRef=useRef<HTMLDivElement|null>(null);
  const mapRef=useRef<any>(null);
  const pointsRef=useRef(points);
  const onChangeRef=useRef(onChange);

  useEffect(()=>{pointsRef.current=points;onChangeRef.current=onChange;
    const map=mapRef.current;
    if(map?.getSource?.("route-draft")){
      map.getSource("route-draft").setData(toGeoJson(points));
    }
  },[points,onChange]);

  useEffect(()=>{
    let disposed=false;
    void import("mapbox-gl").then(({default:mapboxgl})=>{
      if(disposed||!containerRef.current||mapRef.current)return;
      const token=process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
      if(!token)return;
      mapboxgl.accessToken=token;
      const map=new mapboxgl.Map({container:containerRef.current,style:"mapbox://styles/mapbox/dark-v11",center:[-98.2,19.3],zoom:11});
      mapRef.current=map;
      map.on("load",()=>{
        map.addSource("route-draft",{type:"geojson",data:toGeoJson(pointsRef.current)});
        map.addLayer({id:"route-draft-line",type:"line",source:"route-draft",paint:{"line-color":"#fb7185","line-width":5}});
        map.addLayer({id:"route-draft-points",type:"circle",source:"route-draft",paint:{"circle-color":"#ffffff","circle-radius":5,"circle-stroke-color":"#e11d48","circle-stroke-width":2}});
        fit(map,mapboxgl,pointsRef.current);
      });
      map.on("click",(event:any)=>{
        const next=[...pointsRef.current,{latitude:event.lngLat.lat,longitude:event.lngLat.lng}];
        pointsRef.current=next;
        onChangeRef.current(next);
      });
    });
    return()=>{disposed=true;mapRef.current?.remove?.();mapRef.current=null};
  },[]);

  if(!process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN){
    return <div className="card muted">Configura NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN para editar la ruta en el mapa.</div>;
  }

  return <div className="grid">
    <div ref={containerRef} className="map" style={{minHeight:480}}/>
    <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
      <button type="button" className="btn secondary" onClick={()=>onChange(points.slice(0,-1))} disabled={!points.length}>Deshacer último punto</button>
      <button type="button" className="btn secondary" onClick={()=>onChange([])} disabled={!points.length}>Limpiar geometría</button>
      <span className="muted" style={{alignSelf:"center"}}>Haz clic sobre el mapa para añadir puntos en orden.</span>
    </div>
  </div>;
}

function toGeoJson(points:Point[]){
  return {type:"FeatureCollection",features:[
    ...(points.length>=2?[{type:"Feature",properties:{kind:"line"},geometry:{type:"LineString",coordinates:points.map(point=>[point.longitude,point.latitude])}}]:[]),
    ...points.map((point,index)=>({type:"Feature",properties:{kind:"point",index},geometry:{type:"Point",coordinates:[point.longitude,point.latitude]}}))
  ]};
}

function fit(map:any,mapboxgl:any,points:Point[]){
  if(points.length===1)map.easeTo({center:[points[0].longitude,points[0].latitude],zoom:14});
  if(points.length>1){
    const bounds=new mapboxgl.LngLatBounds();
    points.forEach(point=>bounds.extend([point.longitude,point.latitude]));
    map.fitBounds(bounds,{padding:60,maxZoom:15});
  }
}
