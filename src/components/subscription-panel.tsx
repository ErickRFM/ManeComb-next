"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { COMMERCIAL_PLANS } from "@/src/core/domain/commercial-plans";
import { UiModal } from "@/src/components/ui-modal";

export function SubscriptionPanel(){
  const [subscription,setSubscription]=useState<any>(undefined);
  const [error,setError]=useState("");
  const [canManage,setCanManage]=useState(false);
  const [selectedPlan,setSelectedPlan]=useState("");
  const [confirmAction,setConfirmAction]=useState<"cancel"|"changePlan"|null>(null);
  const [busy,setBusy]=useState(false);
  const [feedback,setFeedback]=useState("");

  useEffect(()=>{
    fetch("/api/account/subscription").then(async response=>{
      const data=await response.json();
      if(!response.ok)throw new Error(data.error||"No se pudo cargar la suscripción");
      setSubscription(data.subscription);
      setCanManage(Boolean(data.canManageBilling));
      setSelectedPlan(data.subscription?.planCode||COMMERCIAL_PLANS[0].code);
    }).catch(error=>setError(error.message));
  },[]);

  const plan=useMemo(()=>COMMERCIAL_PLANS.find(item=>item.code===subscription?.planCode)||null,[subscription?.planCode]);
  async function change(){
    if(!confirmAction||busy)return;
    setBusy(true);setFeedback("");
    try{
      const response=await fetch("/api/account/subscription",{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({action:confirmAction,planCode:selectedPlan})});
      const data=await response.json();
      if(!response.ok)throw new Error(data.error==="PLAN_CAPACITY_EXCEEDED"?"Archiva unidades antes de reducir la capacidad.":data.error==="BILLING_PROVIDER_UNAVAILABLE"?"No se pudo confirmar con Mercado Pago. Vuelve a consultar antes de reintentar.":"No se pudo confirmar el cambio. Consulta el estado antes de reintentar.");
      setSubscription(data.subscription);setConfirmAction(null);setFeedback("Cambio confirmado por Mercado Pago.");
    }catch(error){setFeedback(error instanceof Error?error.message:"No se pudo confirmar el cambio")}
    finally{setBusy(false)}
  }

  if(error)return <div className="system-error-card">{error}</div>;
  if(subscription===undefined)return <div className="billing-skeleton"><div/><div/><div/></div>;

  if(!subscription)return <section className="billing-empty">
    <div><span className="eyebrow">SUSCRIPCIÓN</span><h2>Activa un plan para operar</h2><p>El plan define cuántas unidades puede registrar la empresa y mantiene habilitados los módulos operativos.</p></div>
    <Link className="btn" href="/planes">Ver planes</Link>
  </section>;

  const status=String(subscription.status||"unknown");
  const active=status==="active";
  return <section className="subscription-overview">
    <div className="subscription-hero">
      <div>
        <span className="eyebrow">PLAN ACTUAL</span>
        <div className="subscription-title"><h2>{plan?.label||subscription.planCode}</h2><span className={"state-badge "+(active?"active":"maintenance")}>{status}</span></div>
        <p>{plan?plan.monthlyMxn+" MXN / mes":"Tarifa administrada"} · {subscription.vehicleLimit||plan?.units||"—"} unidades incluidas</p>
      </div>
      <div className="subscription-price"><strong>{plan?("$"+plan.monthlyMxn):"—"}</strong><small>MXN / mes</small></div>
    </div>
    {feedback?<p role="status">{feedback}</p>:null}
    {canManage&&subscription.provider==="mercadopago"&&status!=="cancelled"?<div className="card grid">
      <label htmlFor="subscription-plan">Cambiar plan</label>
      <select id="subscription-plan" value={selectedPlan} onChange={event=>setSelectedPlan(event.target.value)} disabled={busy}>{COMMERCIAL_PLANS.map(item=><option key={item.code} value={item.code}>{item.label} · ${item.monthlyMxn} MXN / mes</option>)}</select>
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}><button className="btn" disabled={busy||selectedPlan===subscription.planCode} onClick={()=>setConfirmAction("changePlan")}>Revisar cambio</button><button className="btn secondary" disabled={busy} onClick={()=>setConfirmAction("cancel")}>Cancelar suscripción</button></div>
    </div>:null}
    <UiModal open={confirmAction!==null} title={confirmAction==="cancel"?"Cancelar suscripción":"Confirmar cambio de plan"} description={confirmAction==="cancel"?"Se cancelará el cobro recurrente en Mercado Pago y se deshabilitará el acceso operativo.":"Mercado Pago confirmará la nueva tarifa recurrente y el servidor validará la capacidad de tu flota."} onClose={()=>{if(!busy)setConfirmAction(null)}}>
      {confirmAction==="changePlan"?<p>{COMMERCIAL_PLANS.find(item=>item.code===selectedPlan)?.label} · ${COMMERCIAL_PLANS.find(item=>item.code===selectedPlan)?.monthlyMxn} MXN / mes</p>:null}
      <button className="btn" disabled={busy} onClick={()=>void change()}>{busy?"Confirmando...":"Confirmar"}</button>
    </UiModal>

    <div className="subscription-facts">
      <div><span className="metric-label">Estado</span><strong>{active?"Servicio activo":status}</strong><small>{active?"La operación está habilitada.":"Requiere atención comercial."}</small></div>
      <div><span className="metric-label">Capacidad</span><strong>{subscription.vehicleLimit||plan?.units||"—"} unidades</strong><small>Límite aplicado por servidor</small></div>
      <div><span className="metric-label">Plan</span><strong>{subscription.planCode}</strong><small>Catálogo canónico ManeComb</small></div>
    </div>
  </section>;
}
