"use client";

import { useEffect, useMemo, useState } from "react";

export function AuditPanel(){
  const [events,setEvents]=useState<any[]>([]);
  const [state,setState]=useState("Cargando auditoría...");
  const [search,setSearch]=useState("");
  const [scope,setScope]=useState<"all"|"security"|"operations"|"billing">("all");

  useEffect(()=>{
    fetch("/api/admin/audit?limit=150").then(async response=>{
      const data=await response.json();
      if(!response.ok)throw new Error(data.error||"No se pudo cargar auditoría");
      setEvents(data.events||[]);setState((data.events||[]).length+" eventos");
    }).catch(error=>setState(error.message));
  },[]);

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
      const text=[event.action,event.entityType,event.entityId,event.organizationId,event.actorUserId].filter(Boolean).join(" ").toLowerCase();
      return matchesScope&&(!q||text.includes(q));
    });
  },[events,search,scope]);

  return <div className="audit-center">
    <div className="entity-toolbar">
      <div className="entity-search"><span>⌕</span><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar acción, entidad, organización o actor..."/></div>
      <div className="compact-filters">{(["all","security","operations","billing"] as const).map(value=><button key={value} className={scope===value?"active":""} onClick={()=>setScope(value)}>{value==="all"?"Todo":value==="security"?"Seguridad":value==="operations"?"Operación":"Facturación"}</button>)}</div>
      <span className="entity-state">{state}</span>
    </div>

    <div className="audit-timeline">
      {visible.map(event=>{
        const category=classify(event.action);
        return <article className="audit-event" key={event._id}>
          <div className={"audit-node "+category}/>
          <div className="audit-event-card">
            <div className="audit-event-head"><div><span className={"audit-category "+category}>{category}</span><strong>{event.action}</strong></div><time>{new Date(event.occurredAt).toLocaleString()}</time></div>
            <div className="audit-facts">
              <span><small>Entidad</small><strong>{event.entityType||"Sistema"} {event.entityId?String(event.entityId).slice(-8):""}</strong></span>
              <span><small>Organización</small><strong>{event.organizationId?String(event.organizationId).slice(-8):"global"}</strong></span>
              <span><small>Actor</small><strong>{event.actorUserId?String(event.actorUserId).slice(-8):"sistema"}</strong></span>
            </div>
            {event.metadata?<details className="audit-details"><summary>Ver metadata</summary><pre>{JSON.stringify(event.metadata,null,2)}</pre></details>:null}
          </div>
        </article>;
      })}
      {!visible.length?<div className="empty-state"><strong>Sin eventos</strong><span>No hay registros que coincidan con los filtros actuales.</span></div>:null}
    </div>
  </div>;
}
