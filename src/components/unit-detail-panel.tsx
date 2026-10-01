"use client";
import Link from "next/link";
import {useEffect,useId,useState} from "react";
import type {OperationalUnitSnapshot} from "@/src/core/contracts/telemetry";
import {fleetMarkerState} from "@/src/lib/fleet-density";
import {Icon} from "@/src/components/ui/icon";
type Resource={loading:boolean;data:any;error:string;denied:boolean};
function useResource(url:string|null){
  const [retry,setRetry]=useState(0);const [resource,setResource]=useState<Resource>({loading:false,data:null,error:"",denied:false});
  useEffect(()=>{
    if(!url){setResource({loading:false,data:null,error:"",denied:false});return}
    const controller=new AbortController();let active=true;
    const timer=setTimeout(()=>controller.abort(),12000);
    setResource({loading:true,data:null,error:"",denied:false});
    void fetch(url,{signal:controller.signal,cache:"no-store"}).then(async response=>{
      if(response.status===403){if(active)setResource({loading:false,data:null,error:"",denied:true});return}
      if(!response.ok)throw new Error();const data=await response.json();
      if(active)setResource({loading:false,data,error:"",denied:false});
    }).catch(()=>{if(active)setResource({loading:false,data:null,error:"No se pudo cargar el detalle.",denied:false})}).finally(()=>clearTimeout(timer));
    return()=>{active=false;clearTimeout(timer);controller.abort()};
  },[url,retry]);
  return {...resource,retry:()=>setRetry(value=>value+1)};
}
function ResourceState({resource}:{resource:ReturnType<typeof useResource>}){
  if(resource.loading)return <p role="status">Cargando detalle…</p>;
  if(resource.denied)return <p role="status">Tu rol no permite consultar este detalle.</p>;
  if(resource.error)return <p role="alert">{resource.error} <button className="btn secondary" onClick={resource.retry}>Reintentar detalle</button></p>;
  return null;
}
const tabs=["Resumen","Ruta","Incidencias","Documentos","Telemetría"] as const;
export function UnitDetailPanel({unit,onClose}:{unit:OperationalUnitSnapshot;onClose:()=>void}){
  const [tab,setTab]=useState<typeof tabs[number]>("Resumen");
  const [level,setLevel]=useState<"compact"|"medium"|"expanded">("medium");
  const id=useId();
  const driver=useResource(tab==="Resumen"&&unit.driverId?"/api/drivers":null);
  const journey=useResource(tab==="Resumen"&&unit.journeyId?"/api/journeys":null);
  const route=useResource(tab==="Ruta"&&unit.routeId?"/api/routes/"+encodeURIComponent(unit.routeId):null);
  const incidents=useResource(tab==="Incidencias"?"/api/incidents":null);
  const documents=useResource(tab==="Documentos"?"/api/documents":null);
  const driverRow=driver.data?.drivers?.find((item:any)=>String(item._id)===unit.driverId);
  const journeyRow=journey.data?.journeys?.find((item:any)=>String(item._id)===unit.journeyId);
  const rows=incidents.data?.incidents?.filter((item:any)=>String(item.vehicleId)===unit.vehicleId)||[];
  const docs=documents.data?.documents?.filter((item:any)=>(item.ownerType==="vehicle"&&String(item.ownerId)===unit.vehicleId)||(unit.driverId&&item.ownerType==="driver"&&String(item.ownerId)===unit.driverId))||[];
  const ready=(resource:Resource)=>!resource.loading&&!resource.denied&&!resource.error&&resource.data;
  return <aside className={"unit-detail-panel unit-sheet "+level} aria-label={"Detalle de "+unit.economicNumber}>
    <div className="unit-detail-head"><div><span className={"unit-status-dot "+fleetMarkerState(unit)}/><div><strong>{unit.economicNumber}</strong><small>{unit.routeName||"Sin ruta asignada"}</small></div></div><button className="icon-action" onClick={onClose} aria-label="Cerrar detalle"><Icon name="close"/></button></div>
    <div className="unit-sheet-levels" role="group" aria-label="Altura del detalle">{(["compact","medium","expanded"] as const).map(value=><button key={value} aria-pressed={level===value} onClick={()=>setLevel(value)}>{value==="compact"?"Compacto":value==="medium"?"Medio":"Expandido"}</button>)}</div>
    <div className="unit-sheet-body">
      <div className="unit-detail-tabs" role="tablist" aria-label="Información de unidad">{tabs.map((value,index)=><button key={value} role="tab" id={id+"-tab-"+index} aria-controls={id+"-panel"} aria-selected={tab===value} tabIndex={tab===value?0:-1} onClick={()=>setTab(value)} onKeyDown={event=>{
        let next:number|undefined;
        if(event.key==="ArrowRight")next=(index+1)%tabs.length;if(event.key==="ArrowLeft")next=(index+tabs.length-1)%tabs.length;
        if(event.key==="Home")next=0;if(event.key==="End")next=tabs.length-1;
        if(next!==undefined){event.preventDefault();setTab(tabs[next]);document.getElementById(id+"-tab-"+next)?.focus()}
      }}>{value}</button>)}</div>
      <div role="tabpanel" id={id+"-panel"} aria-labelledby={id+"-tab-"+tabs.indexOf(tab)} tabIndex={0}>
        {tab==="Resumen"?<>
          <div className="unit-detail-status"><span className={"health-chip "+fleetMarkerState(unit)}>{unit.freshness}</span><span className="health-chip">{unit.status}</span>{unit.isOffRoute?<span className="health-chip danger">Fuera de ruta</span>:null}</div>
          <div className="unit-detail-grid"><div><small>Velocidad</small><strong>{unit.speedKmH.toFixed(0)} km/h</strong></div><div><small>Avance</small><strong>{unit.progressPercent==null?"—":unit.progressPercent.toFixed(0)+"%"}</strong></div><div><small>ETA</small><strong>{unit.etaMinutes==null?"—":unit.etaMinutes+" min"}</strong></div><div><small>Corredor</small><strong>{unit.distanceFromRouteM==null?"—":unit.distanceFromRouteM+" m"}</strong></div></div>
          <p>Conductor: {!unit.driverId?"Sin asignación":driverRow?.name||"Asignado; consulta su detalle según tu acceso"}</p><ResourceState resource={driver}/>
          <p>Jornada: {!unit.journeyId?"Sin jornada":journeyRow?.state||"Asignada; detalle pendiente"}</p><ResourceState resource={journey}/>
          {unit.nextStop?<div className="next-stop-card"><small>PRÓXIMA PARADA</small><strong>{unit.nextStop.name}</strong><span>{unit.nextStop.distanceRemainingM} m restantes</span></div>:null}
          <Link href="/portal/unidades">Ver unidades</Link>
        </>:null}
        {tab==="Ruta"?<><ResourceState resource={route}/>{!unit.routeId?<p>Sin ruta asignada.</p>:ready(route)?<div className="grid"><strong>{route.data.route.name}</strong><span>{route.data.route.origin||"Origen sin registrar"} → {route.data.route.destination||"Destino sin registrar"}</span><span>Revisión {route.data.route.revision} · {route.data.route.status}</span><ol>{[...(route.data.route.stops||[])].sort((a:any,b:any)=>a.order-b.order).map((stop:any)=><li key={stop.order}>{stop.name}</li>)}</ol><Link href={"/portal/rutas/"+encodeURIComponent(unit.routeId)}>Abrir ruta</Link></div>:null}</>:null}
        {tab==="Incidencias"?<><ResourceState resource={incidents}/>{ready(incidents)?<div className="grid">{rows.length?rows.map((item:any)=><article key={item._id}><strong>{item.type} · {item.status}</strong><p>{item.message||"Sin descripción"}</p></article>):<p>Sin incidencias de esta unidad en los reportes recientes.</p>}<Link href="/portal/incidencias">Abrir incidencias</Link></div>:null}</>:null}
        {tab==="Documentos"?<><ResourceState resource={documents}/>{ready(documents)?<div className="grid">{docs.length?docs.map((item:any)=><article key={item._id}><strong>{item.kind} · {item.status}</strong><p>Vigencia: {item.expiresAt?new Date(item.expiresAt).toLocaleDateString():"Sin vencimiento"}</p><a href={"/api/documents/"+item._id+"/download"} target="_blank" rel="noreferrer">Ver documento</a></article>):<p>Sin documentos registrados para la unidad o su conductor.</p>}<Link href="/portal/documentos">Abrir documentos</Link></div>:null}</>:null}
        {tab==="Telemetría"?<dl className="unit-telemetry"><dt>GPS</dt><dd>{unit.freshness}</dd><dt>Último reporte</dt><dd>{unit.recordedAt?new Date(unit.recordedAt).toLocaleString():"Sin reporte"}</dd><dt>Latitud</dt><dd>{unit.latitude??"Sin coordenada"}</dd><dt>Longitud</dt><dd>{unit.longitude??"Sin coordenada"}</dd><dt>Rumbo</dt><dd>{unit.heading==null?"Sin reporte":unit.heading+"°"}</dd><dt>Velocidad</dt><dd>{unit.speedKmH.toFixed(0)} km/h</dd></dl>:null}
      </div>
      <div className="unit-detail-footer"><span>Último GPS</span><strong>{unit.recordedAt?new Date(unit.recordedAt).toLocaleTimeString():"Sin reporte"}</strong></div>
    </div>
  </aside>;
}
