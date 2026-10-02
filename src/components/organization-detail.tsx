"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export function OrganizationDetail({organizationId}:{organizationId:string}){
  const [data,setData]=useState<any>(null);
  const [loading,setLoading]=useState(true),[error,setError]=useState(""),[retry,setRetry]=useState(0);

  useEffect(()=>{
    let mounted=true;setLoading(true);setError("");
    fetch("/api/admin/organizations/"+organizationId,{cache:"no-store"}).then(async response=>{
      const body=await response.json();
      if(!response.ok)throw new Error(body.error||"DETAIL_ERROR");
      if(mounted)setData(body);
    }).catch(error=>{if(mounted)setError(error instanceof Error?error.message:"No se pudo cargar la empresa.");})
      .finally(()=>{if(mounted)setLoading(false)});
    return()=>{mounted=false};
  },[organizationId,retry]);

  if(loading)return <p role="status">Cargando empresa…</p>;
  if(error)return <div className="system-error-card" role="alert">{error} <button className="btn secondary" onClick={()=>setRetry(value=>value+1)}>Reintentar</button></div>;
  if(!data)return null;

  const org=data.organization,sub=data.subscription,summary=data.summary||{};
  const money=(value:number)=>new Intl.NumberFormat("es-MX",{style:"currency",currency:"MXN"}).format(value||0);

  return <div className="grid">
    <div className="entity-toolbar"><Link href="/admin/empresas" className="btn secondary">← Volver a empresas</Link><span className="entity-state">{org.status} · {org.planCode||"sin plan"}</span></div>

    <section className="entity-metrics">
      <div><small>Usuarios</small><strong>{summary.users?.total??0}</strong><span>{summary.users?.active??0} activos</span></div>
      <div><small>Unidades</small><strong>{summary.vehicles?.total??0}</strong><span>{Object.entries(summary.vehicles?.byStatus||{}).map(([key,value])=>key+" "+value).join(" · ")||"Sin unidades"}</span></div>
      <div><small>Jornadas</small><strong>{summary.journeys?.total??0}</strong><span>{summary.journeys?.byState?.RUNNING||0} en curso</span></div>
      <div><small>Incidencias abiertas</small><strong>{summary.openIncidents??0}</strong><span>open + acknowledged</span></div>
    </section>

    <div className="grid grid-2">
      <section className="card grid">
        <div><span className="eyebrow">EMPRESA</span><h2>{org.name}</h2><p className="muted">{org.slug}</p></div>
        <div className="audit-facts">
          <span><small>Estado</small><strong>{org.status}</strong></span>
          <span><small>Plan</small><strong>{org.planCode||"Sin plan"}</strong></span>
          <span><small>Creada</small><strong>{org.createdAt?new Date(org.createdAt).toLocaleString():"—"}</strong></span>
        </div>
        <div><small>Propietario</small><p><strong>{data.owner?.name||"No identificado"}</strong><br/><span className="muted">{data.owner?.email||"Sin correo"}</span></p></div>
      </section>

      <section className="card grid">
        <div><span className="eyebrow">SUSCRIPCIÓN</span><h2>{sub?.planCode||"Sin suscripción"}</h2></div>
        {sub?<div className="audit-facts">
          <span><small>Estado</small><strong>{sub.status}</strong></span>
          <span><small>Proveedor</small><strong>{sub.provider}</strong></span>
          <span><small>Límite</small><strong>{sub.vehicleLimit||"—"}</strong></span>
          <span><small>Periodo</small><strong>{sub.currentPeriodEnd?new Date(sub.currentPeriodEnd).toLocaleDateString():"—"}</strong></span>
        </div>:<p className="muted">No existe una suscripción persistida para esta empresa.</p>}
      </section>
    </div>

    <section className="card grid">
      <div><span className="eyebrow">PAGOS</span><h2>Actividad reciente</h2></div>
      <div className="admin-payment-list">
        {(data.recentPayments||[]).map((payment:any)=><article className="admin-payment-row" key={payment._id}>
          <span className={"payment-icon "+payment.status}>$</span>
          <div className="payment-copy"><strong>{payment.planCode}</strong><small>{payment.createdAt?new Date(payment.createdAt).toLocaleString():"—"}</small></div>
          <div className="payment-amount"><strong>{money(payment.amountMxn)}</strong><small>{payment.status}</small></div>
        </article>)}
        {!data.recentPayments?.length?<p className="muted">Sin pagos registrados recientemente.</p>:null}
      </div>
    </section>

    <section className="card grid">
      <div><span className="eyebrow">AUDITORÍA</span><h2>Eventos recientes</h2></div>
      <div className="audit-timeline">
        {(data.recentAudit||[]).map((event:any)=><article className="audit-event" key={event._id}>
          <div className={"audit-node "+(event.category||"operations")}/>
          <div className="audit-event-card">
            <div className="audit-event-head"><strong>{event.action}</strong><time>{new Date(event.occurredAt).toLocaleString()}</time></div>
            <div className="audit-facts"><span><small>Entidad</small><strong>{event.entityType||"Sistema"}</strong></span><span><small>Actor</small><strong>{event.actorUserId?String(event.actorUserId).slice(-8):"sistema"}</strong></span></div>
          </div>
        </article>)}
      </div>
    </section>
  </div>;
}
