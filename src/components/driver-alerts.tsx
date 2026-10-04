"use client";
import Link from "next/link";
import {useEffect,useState} from "react";
import {useSocket,useSocketStatus} from "@/src/hooks/useSocket";
import {groupIncidentReports,incidentDate,incidentStatus} from "@/src/components/mobile-ui/alert-presentation";
type Alert={_id:string;type?:string|null;severity?:string|null;status?:string|null;message?:string;createdAt?:string|null};
export function DriverAlerts(){
  const socket=useSocket();const connection=useSocketStatus(socket);
  const [alerts,setAlerts]=useState<Alert[]>([]);const [loading,setLoading]=useState(true);const [error,setError]=useState("");const [retry,setRetry]=useState(0);
  useEffect(()=>{
    let active=true;
    const load=()=>void fetch("/api/incidents",{cache:"no-store"}).then(async response=>{
      if(!response.ok)throw new Error();const data=await response.json();
      if(active){setAlerts(data.incidents||[]);setError("")}
    }).catch(()=>active&&setError("No se pudieron cargar tus alertas. Revisa tu conexión o tu acceso."))
      .finally(()=>active&&setLoading(false));
    load();socket.on("connect",load);socket.on("incident:new",load);socket.on("incident:update",load);
    return()=>{active=false;socket.off("connect",load);socket.off("incident:new",load);socket.off("incident:update",load)};
  },[socket,retry]);
  return <section className="grid mobile-v3-alerts"><div><h1>Alertas</h1><p>Incidencias que has reportado y su estado de seguimiento.</p></div>
    <Link className="btn" href="/operacion/sos">Reportar SOS</Link>
    <p role="status">{connection==="connected"?"En línea":"Reconectando; puedes actualizar la lista."}</p>
    <button className="btn secondary" disabled={loading} onClick={()=>{setLoading(true);setRetry(value=>value+1)}}>Actualizar</button>
    {error?<p role="alert">{error}</p>:loading?<p role="status">Cargando alertas…</p>:!alerts.length?<div className="empty-state"><strong>Sin alertas reportadas</strong><span>Tus reportes aparecerán aquí.</span></div>:null}
    {groupIncidentReports(alerts).map(group=><section className="mobile-v3-alert-group" role="region" aria-label={group.heading} data-severity-group={group.heading} key={group.heading}>
      <h2>{group.heading}</h2><div className="grid">{group.items.map(alert=>{
        const date=incidentDate(alert.createdAt);
        return <article className="card grid" key={alert._id}><div className="mobile-v3-alert-meta"><strong>{alert.type==="sos"?"SOS":alert.type||"Tipo no disponible"}</strong><span className="badge">{incidentStatus(alert.status)}</span></div><p>{alert.message||"Sin descripción"}</p>{date==="Fecha no disponible"?<span className="mobile-v3-alert-date">{date}</span>:<time className="mobile-v3-alert-date" dateTime={alert.createdAt!}>{date}</time>}</article>;
      })}</div>
    </section>)}
  </section>;
}
