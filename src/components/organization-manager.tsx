"use client";
import { useCallback, useEffect, useState } from "react";

export function OrganizationManager(){
  const [organizations,setOrganizations]=useState<any[]>([]);
  const [state,setState]=useState("Cargando...");

  const load=useCallback(async()=>{
    const response=await fetch("/api/admin/organizations");
    const data=await response.json();
    if(!response.ok)throw new Error(data.error||"No se pudieron cargar");
    setOrganizations(data.organizations||[]);
    setState((data.organizations||[]).length+" empresas");
  },[]);

  useEffect(()=>{void load().catch(e=>setState(e.message))},[load]);

  async function update(id:string,patch:Record<string,string>){
    const response=await fetch("/api/admin/organizations/"+id,{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify(patch)});
    const data=await response.json();
    if(!response.ok)return setState(data.error||"No se pudo actualizar");
    await load();
  }

  return <div className="grid"><span className="muted">{state}</span><div className="grid grid-3">
    {organizations.map(org=><div className="card grid" key={org._id}>
      <div><h3 style={{marginTop:0}}>{org.name}</h3><p className="muted">{org.slug}</p></div>
      <label>Estado<select className="input" value={org.status} onChange={(e)=>void update(org._id,{status:e.target.value})}><option value="active">Activa</option><option value="paused">Pausada</option><option value="suspended">Suspendida</option></select></label>
      <label>Plan<select className="input" value={org.planCode||"starter"} onChange={(e)=>void update(org._id,{planCode:e.target.value})}><option value="starter">starter</option><option value="pro">pro</option><option value="enterprise">enterprise</option></select></label>
    </div>)}
  </div></div>
}
