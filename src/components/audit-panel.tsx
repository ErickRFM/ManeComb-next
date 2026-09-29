"use client";
import { useEffect, useState } from "react";

export function AuditPanel(){
  const [events,setEvents]=useState<any[]>([]);
  const [state,setState]=useState("Cargando auditoría...");
  useEffect(()=>{
    fetch("/api/admin/audit?limit=150").then(async response=>{
      const data=await response.json();
      if(!response.ok)throw new Error(data.error||"No se pudo cargar auditoría");
      setEvents(data.events||[]);
      setState((data.events||[]).length+" eventos");
    }).catch(error=>setState(error.message));
  },[]);

  return <div className="grid">
    <span className="muted">{state}</span>
    {events.length===0?<div className="card muted">Sin eventos.</div>:events.map(event=><div className="card" key={event._id}>
      <div className="status-row"><strong>{event.action}</strong><span className="muted">{new Date(event.occurredAt).toLocaleString()}</span></div>
      <p className="muted" style={{marginBottom:0}}>{event.entityType||"Sistema"} {event.entityId||""} · org {event.organizationId||"global"} · actor {event.actorUserId||"sistema"}</p>
      {event.metadata?<pre style={{whiteSpace:"pre-wrap",overflowWrap:"anywhere"}}>{JSON.stringify(event.metadata,null,2)}</pre>:null}
    </div>)}
  </div>
}
