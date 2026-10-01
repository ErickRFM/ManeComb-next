"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {usePortalPermission} from "@/src/hooks/usePortalPermission";
import {Icon} from "@/src/components/ui/icon";

export function RouteList(){
  const canEdit=usePortalPermission("manage_routes");
  const [routes,setRoutes]=useState<any[]>([]);
  const [state,setState]=useState("Cargando rutas...");
  const [search,setSearch]=useState("");
  const [retry,setRetry]=useState(0);const [loading,setLoading]=useState(true);const [error,setError]=useState("");

  useEffect(()=>{
    let active=true;setLoading(true);
    fetch("/api/routes").then(async response=>{
      const data=await response.json();
      if(!response.ok)throw new Error(data.error||"No se pudieron cargar rutas");
      if(active){setRoutes(data.routes||[]);setState((data.routes||[]).length+" rutas");setError("")}
    }).catch(()=>active&&setError("No se pudieron cargar las rutas. Revisa tu conexión o tu acceso."))
      .finally(()=>active&&setLoading(false));
    return()=>{active=false};
  },[retry]);

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
      <div className="entity-search"><span>⌕</span><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar ruta, origen o destino..." aria-label="Buscar ruta"/></div>
      <span className="entity-state" role="status">{loading?"Cargando rutas…":state}</span>
      <button className="btn secondary" disabled={loading} onClick={()=>setRetry(value=>value+1)}>Actualizar rutas</button>
      {canEdit?<><Link className="btn secondary" href="/portal/rutas/candidatas">Rutas aprendidas</Link><Link className="btn" href="/portal/rutas/nueva">+ Nueva ruta</Link></>:null}
    </div>
    {error?<p role="alert">{error}</p>:null}

    <div className="entity-table route-table">
      <div className="entity-table-row entity-table-head"><span>Ruta</span><span>Estado</span><span>Revisión</span><span>Acción</span></div>
      {visible.map(route=><div className="entity-table-row" key={route._id}>
        <div className="entity-primary"><span className="entity-avatar"><Icon name="route"/></span><div><strong>{route.name}</strong><small>{route.origin||"Origen"} → {route.destination||"Destino"}</small></div></div>
        <div><span className={"state-badge "+(route.status==="active"?"active":route.status==="archived"?"archived":"maintenance")}>{route.status}</span></div>
        <div className="entity-capacity"><strong>rev {route.revision||1}</strong><small>{route.stops?.length||0} paradas</small></div>
        <div className="entity-actions"><Link className="entity-action-link" href={"/portal/rutas/"+route._id}>{canEdit?"Editar":"Ver ruta"} →</Link></div>
      </div>)}
      {!visible.length&&!loading&&!error?<div className="empty-state"><strong>No encontramos rutas</strong><span>Cambia la búsqueda o crea una ruta nueva.</span></div>:null}
    </div>
  </div>;
}
