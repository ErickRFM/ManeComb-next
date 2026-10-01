"use client";
import {Icon} from "@/src/components/ui/icon";

import { useEffect, useMemo, useState } from "react";

export function AuditPanel(){
  const [events,setEvents]=useState<any[]>([]);
  const [state,setState]=useState("Cargando auditoría...");
  const [search,setSearch]=useState("");
  const [loading,setLoading]=useState(true),[error,setError]=useState(""),[retry,setRetry]=useState(0);
  const [scope,setScope]=useState<"all"|"security"|"operations"|"billing">("all");

  useEffect(()=>{
    let mounted=true;setLoading(true);setError("");
    fetch("/api/admin/audit?limit=150").then(async response=>{
      const data=await response.json();
      if(!response.ok)throw new Error(data.error||"No se pudo cargar auditoría");
      if(!mounted)return;setEvents(data.events||[]);setState((data.events||[]).length+" eventos");
    }).catch(()=>{if(mounted)setError("No se pudo cargar la auditoría. Revisa tu conexión o tu acceso.")}).finally(()=>{if(mounted)setLoading(false)});return()=>{mounted=false};
  },[retry]);

  const classify=(action:string)=>{
    const value=String(action||"").toLowerCase();
    if(value.includes("payment")||value.includes("subscription")||value.includes("checkout"))return "billing";
    if(value.includes("auth")||value.includes("mfa")||value.includes("session")||value.includes("user"))return "security";
    return "operations";
  };

  const visible=useMemo(()=>{
    const q=search.trim().toLowerCase();
    return events.filter(event=>{
      const category=classify(event.action);
      const matchesScope=scope==="all"||category===scope;
      const text=[event.action,event.entityType,event.entityId,event.organizationId,event.actorUserId,event.metadata?.providerId,event.metadata?.checkoutId,event.metadata?.eventId,event.metadata?.operationId].filter(Boolean).join(" ").toLowerCase();
      return matchesScope&&(!q||text.includes(q));
    });
  },[events,search,scope]);

  return <div className="audit-center">
    <div className="entity-toolbar">
      <div className="entity-search"><span><Icon name="search" size={16}/></span><input value={search} onChange={e=>setSearch(e.target.value)} aria-label="Buscar auditoría" placeholder="Buscar acción, entidad, organización o actor..."/></div>
      <div className="compact-filters">{(["all","security","operations","billing"] as const).map(value=><button key={value} className={scope===value?"active":""} onClick={()=>setScope(value)}>{value==="all"?"Todo":value==="security"?"Seguridad":value==="operations"?"Operación":"Facturación"}</button>)}</div>
      <span className="entity-state" role="status">{loading?"Cargando auditoría…":state}</span><button className="btn secondary" disabled={loading} onClick={()=>setRetry(value=>value+1)}>Actualizar auditoría</button>
    </div>

    {error?<p role="alert">{error}</p>:null}
    <div className="audit-timeline">
      {visible.map(event=>{
        const category=classify(event.action);
        return <article className="audit-event" key={event._id}>
          <div className={"audit-node "+category}/>
          <div className="audit-event-card">
            <div className="audit-event-head"><div><span className={"audit-category "+category}>{category}</span><strong>{event.action}</strong></div><time>{new Date(event.occurredAt).toLocaleString()}</time></div>
            <div className="audit-facts">
              <span><small>Entidad</small><strong title={event.entityId}>{event.entityType||"Sistema"} {event.entityId?String(event.entityId).slice(-8):""}</strong></span>
              <span><small>Organización</small><strong title={event.organizationId||"global"}>{event.organizationId?String(event.organizationId).slice(-8):"global"}</strong></span>
              <span><small>Actor</small><strong>{event.actorUserId?String(event.actorUserId).slice(-8):"sistema"}</strong></span>
            </div>
            {event.metadata?<details className="audit-details"><summary>Ver metadata</summary><pre>{JSON.stringify(event.metadata,null,2)}</pre></details>:null}
          </div>
        </article>;
      })}
      {!visible.length&&!loading&&!error?<div className="empty-state"><strong>Sin eventos</strong><span>No hay registros que coincidan con los filtros actuales.</span></div>:null}
    </div>
  </div>;
}
