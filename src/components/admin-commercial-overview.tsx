"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type SubscriptionRow={
  _id:string;
  organizationId:string;
  planCode:string;
  status:string;
  provider:string;
  vehicleLimit?:number;
  currentPeriodEnd?:string;
  nextPaymentAt?:string;
  lastPaymentAt?:string;
  reconciliationNeeded?:boolean;
  updatedAt?:string;
  organization?:{_id?:string;name?:string;slug?:string;status?:string};
};

export function AdminCommercialOverview(){
  const [items,setItems]=useState<SubscriptionRow[]>([]);
  const [loading,setLoading]=useState(true),[error,setError]=useState("");
  const [search,setSearch]=useState("");
  const [status,setStatus]=useState("");
  const [provider,setProvider]=useState("");

  const load=useCallback(async()=>{
    setLoading(true);setError("");
    try{
      const query=new URLSearchParams({limit:"100"});
      if(search.trim())query.set("search",search.trim());
      if(status)query.set("status",status);
      if(provider)query.set("provider",provider);
      const response=await fetch("/api/admin/commercial?"+query.toString(),{cache:"no-store"});
      const data=await response.json();
      if(!response.ok)throw new Error(data.error||"COMMERCIAL_ERROR");
      setItems(data.subscriptions||[]);
    }catch{setError("No se pudo cargar el estado comercial global.");}
    finally{setLoading(false)}
  },[search,status,provider]);

  useEffect(()=>{void load()},[load]);

  const metrics=useMemo(()=>({
    active:items.filter(item=>item.status==="active").length,
    attention:items.filter(item=>["past_due","paused"].includes(item.status)).length,
    manual:items.filter(item=>item.provider==="manual").length,
    reconciliation:items.filter(item=>item.reconciliationNeeded).length
  }),[items]);

  return <div className="grid">
    <section className="entity-metrics">
      <div><small>Activas</small><strong>{loading?"—":metrics.active}</strong></div>
      <div><small>Atención</small><strong>{loading?"—":metrics.attention}</strong></div>
      <div><small>Manual</small><strong>{loading?"—":metrics.manual}</strong></div>
      <div><small>Reconciliación</small><strong>{loading?"—":metrics.reconciliation}</strong></div>
    </section>

    <div className="entity-toolbar">
      <div className="entity-search"><input aria-label="Buscar suscripciones" value={search} onChange={event=>setSearch(event.target.value)} onKeyDown={event=>{if(event.key==="Enter")void load()}} placeholder="Empresa, plan, proveedor..."/></div>
      <select className="compact-select" value={status} onChange={event=>setStatus(event.target.value)} aria-label="Filtrar estado">
        <option value="">Todos los estados</option><option value="trial">Trial</option><option value="active">Activa</option><option value="past_due">Vencida</option><option value="paused">Pausada</option><option value="cancelled">Cancelada</option>
      </select>
      <select className="compact-select" value={provider} onChange={event=>setProvider(event.target.value)} aria-label="Filtrar proveedor">
        <option value="">Todos los proveedores</option><option value="mercadopago">Mercado Pago</option><option value="manual">Manual</option>
      </select>
      <button className="btn secondary" disabled={loading} onClick={()=>void load()}>Actualizar</button>
    </div>

    {error?<p role="alert">{error}</p>:null}
    <div className="entity-table">
      <div className="entity-table-row entity-table-head"><span>Empresa</span><span>Plan</span><span>Proveedor</span><span>Estado</span></div>
      {items.map(item=><div className="entity-table-row" key={item._id}>
        <div className="entity-primary"><span className="entity-avatar">{String(item.organization?.name||"MC").split(/\s+/).slice(0,2).map(part=>part[0]).join("").toUpperCase()}</span><div><strong>{item.organization?.name||"Empresa"}</strong><small>{item.organization?.slug||String(item.organizationId).slice(-8)}</small></div></div>
        <div><strong>{item.planCode}</strong><small>{item.vehicleLimit?item.vehicleLimit+" unidades":"Sin límite registrado"}</small></div>
        <div><strong>{item.provider}</strong><small>{item.lastPaymentAt?"Último pago "+new Date(item.lastPaymentAt).toLocaleDateString():"Sin pago reciente"}</small></div>
        <div className="entity-capacity"><strong>{item.status}</strong><small>{item.currentPeriodEnd?"Periodo hasta "+new Date(item.currentPeriodEnd).toLocaleDateString():"Sin periodo"}</small>{item.organization? <Link className="entity-link" href={"/admin/empresas/"+item.organizationId}>Ver empresa →</Link>:null}</div>
      </div>)}
      {!items.length&&!loading&&!error?<div className="empty-state"><strong>Sin suscripciones</strong><span>No hay resultados para los filtros actuales.</span></div>:null}
    </div>
  </div>;
}
