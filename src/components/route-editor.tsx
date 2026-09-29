"use client";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { RouteMapDraw } from "@/src/components/route-map-draw";

type Point={latitude:number;longitude:number};
type RouteDto={
  _id?:string;
  name:string;
  origin?:string;
  destination?:string;
  geometry:Point[];
  stops:Array<{name:string;order:number;latitude:number;longitude:number;radiusM:number}>;
  status:"draft"|"active"|"archived";
  revision?:number;
};

const empty:RouteDto={name:"",origin:"",destination:"",geometry:[],stops:[],status:"draft"};

export function RouteEditor({routeId}:{routeId:string}){
  const creating=routeId==="nueva";
  const [route,setRoute]=useState<RouteDto>(empty);
  const [geometry,setGeometry]=useState("[]");
  const [stops,setStops]=useState("[]");
  const [status,setStatus]=useState(creating?"Nueva ruta":"Cargando...");
  const [busy,setBusy]=useState(false);

  const mapPoints=useMemo(()=>parsePoints(geometry),[geometry]);

  useEffect(()=>{
    if(creating)return;
    fetch("/api/routes/"+routeId).then(async(res)=>{
      const data=await res.json();
      if(!res.ok)throw new Error(data.error||"No se pudo cargar la ruta");
      setRoute(data.route);
      setGeometry(JSON.stringify(data.route.geometry||[],null,2));
      setStops(JSON.stringify(data.route.stops||[],null,2));
      setStatus("Revisión "+(data.route.revision||1));
    }).catch((error)=>setStatus(error.message));
  },[creating,routeId]);

  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    setBusy(true);
    setStatus("Validando...");
    try{
      const parsedGeometry=JSON.parse(geometry);
      const parsedStops=JSON.parse(stops);
      const body={...route,geometry:parsedGeometry,stops:parsedStops};
      delete (body as any)._id;
      delete (body as any).revision;
      const response=await fetch(creating?"/api/routes":"/api/routes/"+routeId,{
        method:creating?"POST":"PATCH",
        headers:{"content-type":"application/json"},
        body:JSON.stringify(body)
      });
      const data=await response.json();
      if(!response.ok)throw new Error(data.error||"No se pudo guardar");
      setRoute(data.route);
      setGeometry(JSON.stringify(data.route.geometry||[],null,2));
      setStops(JSON.stringify(data.route.stops||[],null,2));
      setStatus("Guardado · revisión "+(data.route.revision||1));
      if(creating&&data.route?._id)window.history.replaceState(null,"","/portal/rutas/"+data.route._id);
    }catch(error){
      setStatus(error instanceof Error?error.message:"No se pudo guardar");
    }finally{setBusy(false)}
  }

  return <form className="grid" onSubmit={submit}>
    <div className="card grid">
      <div className="status-row"><strong>{creating?"Crear ruta":"Editar ruta"}</strong><span className="muted">{status}</span></div>
      <input className="input" value={route.name} onChange={(e)=>setRoute({...route,name:e.target.value})} placeholder="Nombre de ruta" required/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <input className="input" value={route.origin||""} onChange={(e)=>setRoute({...route,origin:e.target.value})} placeholder="Origen"/>
        <input className="input" value={route.destination||""} onChange={(e)=>setRoute({...route,destination:e.target.value})} placeholder="Destino"/>
      </div>
      <select className="input" value={route.status} onChange={(e)=>setRoute({...route,status:e.target.value as RouteDto["status"]})}>
        <option value="draft">Borrador</option><option value="active">Activa</option>{!creating?<option value="archived">Archivada</option>:null}
      </select>
    </div>

    <RouteMapDraw points={mapPoints} onChange={(points)=>setGeometry(JSON.stringify(points,null,2))}/>

    <div className="card grid">
      <label>Geometría (JSON)<textarea className="input" rows={8} value={geometry} onChange={(e)=>setGeometry(e.target.value)}/></label>
      <label>Paradas (JSON)<textarea className="input" rows={8} value={stops} onChange={(e)=>setStops(e.target.value)}/></label>
      <button className="btn" disabled={busy}>{busy?"Guardando...":"Guardar ruta"}</button>
    </div>
  </form>
}

function parsePoints(value:string):Point[]{
  try{
    const data=JSON.parse(value);
    if(!Array.isArray(data))return[];
    return data.filter((point:any)=>Number.isFinite(point?.latitude)&&Number.isFinite(point?.longitude)).map((point:any)=>({latitude:Number(point.latitude),longitude:Number(point.longitude)}));
  }catch{return[]}
}
