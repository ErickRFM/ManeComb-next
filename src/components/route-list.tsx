"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

export function RouteList(){
  const [routes,setRoutes]=useState<any[]>([]);
  const [state,setState]=useState("Cargando rutas...");
  const [search,setSearch]=useState("");

  useEffect(()=>{
    fetch("/api/routes").then(async response=>{
      const data=await response.json();
      if(!response.ok)throw new Error(data.error||"No se pudieron cargar rutas");
      setRoutes(data.routes||[]);setState((data.routes||[]).length+" rutas");
    }).catch(error=>setState(error.message));
  },[]);

  const visible=useMemo(()=>{
    const q=search.trim().toLowerCase();
    return routes.filter(route=>!q||route.name.toLowerCase().includes(q)||(route.origin||"").toLowerCase().includes(q)||(route.destination||"").toLowerCase().includes(q));
  },[routes,search]);

  return <div className="route-index">
    <section className="entity-metrics route-metrics">
      <div><small>Activas</small><strong>{routes.filter(route=>route.status==="active").length}</strong></div>
      <div><small>Borradores</small><strong>{routes.filter(route=>route.status==="draft").length}</strong></div>
      <div><small>Total</small><strong>{routes.length}</strong></div>
    </section>

    <div className="entity-toolbar">
      <div className="entity-search"><span>⌕</span><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar ruta, origen o destino..."/></div>
      <span className="entity-state">{state}</span>
      <Link className="btn secondary" href="/portal/rutas/candidatas">Rutas aprendidas</Link>
      <Link className="btn" href="/portal/rutas/nueva">+ Nueva ruta</Link>
    </div>

    <div className="entity-table route-table">
      <div className="entity-table-row entity-table-head"><span>Ruta</span><span>Estado</span><span>Revisión</span><span>Acción</span></div>
      {visible.map(route=><div className="entity-table-row" key={route._id}>
        <div className="entity-primary"><span className="entity-avatar">RT</span><div><strong>{route.name}</strong><small>{route.origin||"Origen"} → {route.destination||"Destino"}</small></div></div>
        <div><span className={"state-badge "+(route.status==="active"?"active":route.status==="archived"?"archived":"maintenance")}>{route.status}</span></div>
        <div className="entity-capacity"><strong>rev {route.revision||1}</strong><small>{route.stops?.length||0} paradas</small></div>
        <div className="entity-actions"><Link className="entity-action-link" href={"/portal/rutas/"+route._id}>Editar →</Link></div>
      </div>)}
      {!visible.length?<div className="empty-state"><strong>No encontramos rutas</strong><span>Cambia la búsqueda o crea una ruta nueva.</span></div>:null}
    </div>
  </div>;
}
