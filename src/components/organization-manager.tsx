"use client";
import { useEffect, useState } from "react";
export function OrganizationManager(){
  const [organizations,setOrganizations]=useState<any[]>([]);
  const [state,setState]=useState("Cargando...");
  useEffect(()=>{fetch("/api/admin/organizations").then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.error||"No se pudieron cargar");setOrganizations(d.organizations||[]);setState((d.organizations||[]).length+" empresas")}).catch(e=>setState(e.message))},[]);
  return <div className="grid"><span className="muted">{state}</span><div className="grid grid-3">{organizations.map(org=><div className="card" key={org._id}><h3>{org.name}</h3><p className="muted">{org.slug}</p><div className="status-row"><span className="badge">{org.status}</span><span>{org.planCode}</span></div></div>)}</div></div>
}
