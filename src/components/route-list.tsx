"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
export function RouteList(){
  const [routes,setRoutes]=useState<any[]>([]);
  const [state,setState]=useState("Cargando...");
  useEffect(()=>{fetch("/api/routes").then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.error||"No se pudieron cargar");setRoutes(d.routes||[]);setState((d.routes||[]).length+" rutas")}).catch(e=>setState(e.message))},[]);
  return <div className="grid">
    <div className="status-row"><span className="muted">{state}</span><Link className="btn" href="/portal/rutas/nueva">Nueva ruta</Link></div>
    <div className="grid grid-3">
      {routes.map(route=><Link className="card" href={"/portal/rutas/"+route._id} key={route._id}><h3>{route.name}</h3><p className="muted">{route.origin||"Origen"} → {route.destination||"Destino"}</p><div className="status-row"><span className="badge">{route.status}</span><span className="muted">rev {route.revision||1}</span></div></Link>)}
      <Link className="card" href="/portal/rutas/candidatas"><h3>Rutas aprendidas</h3><p className="muted">Revisar candidatas detectadas por trazas GPS.</p></Link>
    </div>
  </div>
}
