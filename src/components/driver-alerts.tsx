"use client";
import Link from "next/link";
import {useEffect,useState} from "react";
import {useSocket,useSocketStatus} from "@/src/hooks/useSocket";
type Alert={_id:string;type:string;status:string;message?:string;createdAt:string};
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
    load();socket.on("connect",load);socket.on("incident:new",load);socket.on("incident:updated",load);
    return()=>{active=false;socket.off("connect",load);socket.off("incident:new",load);socket.off("incident:updated",load)};
  },[socket,retry]);
  return <section className="grid"><div><h1>Alertas</h1><p>Incidencias que has reportado y su estado de seguimiento.</p></div>
    <Link className="btn" href="/operacion/sos">Reportar SOS</Link>
    <p role="status">{connection==="connected"?"En línea":"Reconectando; puedes actualizar la lista."}</p>
    <button className="btn secondary" disabled={loading} onClick={()=>{setLoading(true);setRetry(value=>value+1)}}>Actualizar</button>
    {error?<p role="alert">{error}</p>:loading?<p role="status">Cargando alertas…</p>:!alerts.length?<div className="empty-state"><strong>Sin alertas reportadas</strong><span>Tus reportes aparecerán aquí.</span></div>:null}
    {alerts.map(alert=><article className="card grid" key={alert._id}><strong>{alert.type==="sos"?"SOS":alert.type}</strong><span className="badge">{alert.status==="resolved"?"Resuelta":alert.status==="acknowledged"?"En seguimiento":"Abierta"}</span><p>{alert.message||"Sin descripción"}</p><time dateTime={alert.createdAt}>{new Date(alert.createdAt).toLocaleString()}</time></article>)}
  </section>;
}
