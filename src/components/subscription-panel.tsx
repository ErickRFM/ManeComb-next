"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { COMMERCIAL_PLANS } from "@/src/core/domain/commercial-plans";

export function SubscriptionPanel(){
  const [subscription,setSubscription]=useState<any>(undefined);
  const [error,setError]=useState("");

  useEffect(()=>{
    fetch("/api/account/subscription").then(async response=>{
      const data=await response.json();
      if(!response.ok)throw new Error(data.error||"No se pudo cargar la suscripción");
      setSubscription(data.subscription);
    }).catch(error=>setError(error.message));
  },[]);

  const plan=useMemo(()=>COMMERCIAL_PLANS.find(item=>item.code===subscription?.planCode)||null,[subscription?.planCode]);

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

    <div className="subscription-facts">
      <div><span className="metric-label">Estado</span><strong>{active?"Servicio activo":status}</strong><small>{active?"La operación está habilitada.":"Requiere atención comercial."}</small></div>
      <div><span className="metric-label">Capacidad</span><strong>{subscription.vehicleLimit||plan?.units||"—"} unidades</strong><small>Límite aplicado por servidor</small></div>
      <div><span className="metric-label">Plan</span><strong>{subscription.planCode}</strong><small>Catálogo canónico ManeComb</small></div>
    </div>
  </section>;
}
