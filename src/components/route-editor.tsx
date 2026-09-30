"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { RouteMapDraw } from "@/src/components/route-map-draw";

type Point={latitude:number;longitude:number};
type Stop={name:string;order:number;latitude:number;longitude:number;radiusM:number};
type RouteDto={
  _id?:string;
  name:string;
  origin?:string;
  destination?:string;
  geometry:Point[];
  stops:Stop[];
  status:"draft"|"active"|"archived";
  revision?:number;
};

const empty:RouteDto={name:"",origin:"",destination:"",geometry:[],stops:[],status:"draft"};

export function RouteEditor({routeId}:{routeId:string}){
  const creating=routeId==="nueva";
  const [route,setRoute]=useState<RouteDto>(empty);
  const [status,setStatus]=useState(creating?"Nueva ruta":"Cargando...");
  const [busy,setBusy]=useState(false);

  useEffect(()=>{
    if(creating)return;
    fetch("/api/routes/"+routeId).then(async response=>{
      const data=await response.json();
      if(!response.ok)throw new Error(data.error||"No se pudo cargar la ruta");
      setRoute({
        ...data.route,
        geometry:data.route.geometry||[],
        stops:(data.route.stops||[]).sort((a:Stop,b:Stop)=>a.order-b.order)
      });
      setStatus("Revisión "+(data.route.revision||1));
    }).catch(error=>setStatus(error.message));
  },[creating,routeId]);

  const distanceKm=useMemo(()=>Math.round(polylineDistance(route.geometry)/100)/10,[route.geometry]);

  function updateStop(index:number,patch:Partial<Stop>){
    setRoute(current=>({...current,stops:current.stops.map((stop,i)=>i===index?{...stop,...patch}:stop)}));
  }

  function addStop(){
    const point=route.geometry[route.geometry.length-1];
    if(!point){setStatus("Dibuja al menos un punto antes de añadir una parada");return}
    setRoute(current=>({...current,stops:[...current.stops,{name:"Parada "+(current.stops.length+1),order:current.stops.length,latitude:point.latitude,longitude:point.longitude,radiusM:50}]}));
  }

  function removeStop(index:number){
    setRoute(current=>({...current,stops:current.stops.filter((_,i)=>i!==index).map((stop,order)=>({...stop,order}))}));
  }

  function moveStop(index:number,direction:-1|1){
    setRoute(current=>{
      const target=index+direction;
      if(target<0||target>=current.stops.length)return current;
      const next=[...current.stops];
      [next[index],next[target]]=[next[target],next[index]];
      return {...current,stops:next.map((stop,order)=>({...stop,order}))};
    });
  }

  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    if(route.geometry.length<2){setStatus("La ruta necesita al menos 2 puntos de geometría");return}
    setBusy(true);setStatus("Validando...");
    try{
      const body={
        name:route.name,
        origin:route.origin||undefined,
        destination:route.destination||undefined,
        geometry:route.geometry,
        stops:route.stops.map((stop,order)=>({...stop,order})),
        distanceKm,
        status:route.status
      };
      const response=await fetch(creating?"/api/routes":"/api/routes/"+routeId,{
        method:creating?"POST":"PATCH",
        headers:{"content-type":"application/json"},
        body:JSON.stringify(body)
      });
      const data=await response.json();
      if(!response.ok)throw new Error(data.error||"No se pudo guardar");
      setRoute({...data.route,geometry:data.route.geometry||[],stops:data.route.stops||[]});
      setStatus("Guardado · revisión "+(data.route.revision||1));
      if(creating&&data.route?._id)window.history.replaceState(null,"","/portal/rutas/"+data.route._id);
    }catch(error){setStatus(error instanceof Error?error.message:"No se pudo guardar")}
    finally{setBusy(false)}
  }

  return <form className="route-builder" onSubmit={submit}>
    <section className="route-builder-head">
      <div className="route-builder-title"><span className="eyebrow">{creating?"NUEVA RUTA":"EDITOR"}</span><h2>{route.name||"Ruta sin nombre"}</h2><p>{status}</p></div>
      <div className="route-builder-actions"><span className={"state-badge "+(route.status==="active"?"active":route.status==="archived"?"archived":"maintenance")}>{route.status}</span><button className="btn" disabled={busy}>{busy?"Guardando...":"Guardar ruta"}</button></div>
    </section>

    <div className="route-builder-layout">
      <div className="route-builder-main">
        <RouteMapDraw points={route.geometry} stops={route.stops} onChange={geometry=>setRoute(current=>({...current,geometry}))}/>
        <section className="route-stops-panel">
          <div className="route-section-head"><div><strong>Paradas</strong><small>El orden define el recorrido operacional y la próxima parada.</small></div><button type="button" className="btn secondary" onClick={addStop}>+ Parada</button></div>
          <div className="route-stop-list">
            {route.stops.map((stop,index)=><article className="route-stop-row" key={index}>
              <span className="route-stop-order">{index+1}</span>
              <div className="route-stop-fields">
                <input className="input" value={stop.name} onChange={e=>updateStop(index,{name:e.target.value})} aria-label={"Nombre de parada "+(index+1)} required/>
                <div className="route-stop-coordinates">
                  <label>Lat<input className="input" type="number" step="0.000001" value={stop.latitude} onChange={e=>updateStop(index,{latitude:Number(e.target.value)})}/></label>
                  <label>Lng<input className="input" type="number" step="0.000001" value={stop.longitude} onChange={e=>updateStop(index,{longitude:Number(e.target.value)})}/></label>
                  <label>Radio<input className="input" type="number" min="10" max="1000" value={stop.radiusM} onChange={e=>updateStop(index,{radiusM:Number(e.target.value)})}/></label>
                </div>
              </div>
              <div className="route-stop-actions"><button type="button" onClick={()=>moveStop(index,-1)} disabled={index===0}>↑</button><button type="button" onClick={()=>moveStop(index,1)} disabled={index===route.stops.length-1}>↓</button><button type="button" className="danger" onClick={()=>removeStop(index)}>×</button></div>
            </article>)}
            {!route.stops.length?<div className="empty-state compact"><strong>Sin paradas</strong><span>Dibuja la geometría y agrega paradas desde el último punto trazado.</span></div>:null}
          </div>
        </section>
      </div>

      <aside className="route-builder-sidebar">
        <section className="route-settings-card">
          <div className="route-section-head"><div><strong>Configuración</strong><small>Datos visibles para central y conductor.</small></div></div>
          <label>Nombre<input className="input" value={route.name} onChange={e=>setRoute({...route,name:e.target.value})} placeholder="Centro → Terminal" required/></label>
          <label>Origen<input className="input" value={route.origin||""} onChange={e=>setRoute({...route,origin:e.target.value})} placeholder="Punto de inicio"/></label>
          <label>Destino<input className="input" value={route.destination||""} onChange={e=>setRoute({...route,destination:e.target.value})} placeholder="Punto final"/></label>
          <label>Publicación<select className="input" value={route.status} onChange={e=>setRoute({...route,status:e.target.value as RouteDto["status"]})}><option value="draft">Borrador</option><option value="active">Activa</option>{!creating?<option value="archived">Archivada</option>:null}</select></label>
        </section>
        <section className="route-summary-card">
          <span className="metric-label">RESUMEN</span>
          <div><small>Geometría</small><strong>{route.geometry.length} puntos</strong></div>
          <div><small>Paradas</small><strong>{route.stops.length}</strong></div>
          <div><small>Distancia aprox.</small><strong>{distanceKm.toFixed(1)} km</strong></div>
          {!creating?<div><small>Revisión</small><strong>{route.revision||1}</strong></div>:null}
        </section>
      </aside>
    </div>
  </form>;
}

function polylineDistance(points:Point[]){
  const radius=6371000;
  const radians=(value:number)=>value*Math.PI/180;
  let total=0;
  for(let index=1;index<points.length;index++){
    const a=points[index-1],b=points[index];
    const dLat=radians(b.latitude-a.latitude),dLon=radians(b.longitude-a.longitude);
    const latA=radians(a.latitude),latB=radians(b.latitude);
    const h=Math.sin(dLat/2)**2+Math.cos(latA)*Math.cos(latB)*Math.sin(dLon/2)**2;
    total+=2*radius*Math.atan2(Math.sqrt(h),Math.sqrt(1-h));
  }
  return total;
}
