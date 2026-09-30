"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { COMMERCIAL_PLANS } from "@/src/core/domain/commercial-plans";

export function OrganizationManager(){
  const [organizations,setOrganizations]=useState<any[]>([]);
  const [state,setState]=useState("Cargando empresas...");
  const [search,setSearch]=useState("");

  const load=useCallback(async()=>{
    const response=await fetch("/api/admin/organizations");
    const data=await response.json();
    if(!response.ok)throw new Error(data.error||"No se pudieron cargar empresas");
    setOrganizations(data.organizations||[]);
    setState((data.organizations||[]).length+" empresas");
  },[]);

  useEffect(()=>{void load().catch(error=>setState(error.message))},[load]);

  const visible=useMemo(()=>{
    const q=search.trim().toLowerCase();
    return organizations.filter(org=>!q||org.name.toLowerCase().includes(q)||(org.slug||"").toLowerCase().includes(q)||(org.planCode||"").toLowerCase().includes(q));
  },[organizations,search]);

  const metrics=useMemo(()=>({
    active:organizations.filter(org=>org.status==="active").length,
    paused:organizations.filter(org=>org.status==="paused").length,
    suspended:organizations.filter(org=>org.status==="suspended").length
  }),[organizations]);

  async function update(id:string,patch:Record<string,string>){
    setState("Actualizando empresa...");
    const response=await fetch("/api/admin/organizations/"+id,{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify(patch)});
    const data=await response.json();
    if(!response.ok){setState(data.error||"No se pudo actualizar");return}
    setState("Empresa actualizada");await load();
  }

  return <div className="entity-manager">
    <section className="entity-metrics">
      <div><small>Activas</small><strong>{metrics.active}</strong></div>
      <div><small>Pausadas</small><strong>{metrics.paused}</strong></div>
      <div><small>Suspendidas</small><strong>{metrics.suspended}</strong></div>
    </section>

    <div className="entity-toolbar">
      <div className="entity-search"><span>⌕</span><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar empresa, slug o plan..."/></div>
      <span className="entity-state">{state}</span>
    </div>

    <div className="entity-table organization-table">
      <div className="entity-table-row entity-table-head"><span>Empresa</span><span>Estado</span><span>Plan</span><span>Administración</span></div>
      {visible.map(org=><div className="entity-table-row" key={org._id}>
        <div className="entity-primary"><span className="entity-avatar">{String(org.name||"MC").split(/\s+/).slice(0,2).map((part:string)=>part[0]).join("").toUpperCase()}</span><div><strong>{org.name}</strong><small>{org.slug}</small></div></div>
        <div><select className="compact-select" value={org.status} onChange={e=>void update(org._id,{status:e.target.value})}><option value="active">Activa</option><option value="paused">Pausada</option><option value="suspended">Suspendida</option></select></div>
        <div><select className="compact-select" value={COMMERCIAL_PLANS.some(plan=>plan.code===org.planCode)?org.planCode:""} onChange={e=>e.target.value&&void update(org._id,{planCode:e.target.value})}><option value="">Sin plan / legado</option>{COMMERCIAL_PLANS.map(plan=><option value={plan.code} key={plan.code}>{plan.label}</option>)}</select></div>
        <div className="entity-capacity"><strong>{org.planCode||"sin plan"}</strong><small>{org.updatedAt?"actualizada "+new Date(org.updatedAt).toLocaleDateString():"gobierno multitenant"}</small></div>
      </div>)}
      {!visible.length?<div className="empty-state"><strong>No encontramos empresas</strong><span>Cambia la búsqueda para ampliar los resultados.</span></div>:null}
    </div>
  </div>;
}
