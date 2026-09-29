"use client";
import { useEffect, useState } from "react";
export function SubscriptionPanel(){
  const [subscription,setSubscription]=useState<any>(undefined);
  const [error,setError]=useState("");
  useEffect(()=>{fetch("/api/account/subscription").then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.error||"No se pudo cargar");setSubscription(d.subscription)}).catch(e=>setError(e.message))},[]);
  if(error)return <div className="card" style={{color:"#fb7185"}}>{error}</div>;
  if(subscription===undefined)return <div className="card muted">Consultando suscripción...</div>;
  if(!subscription)return <div className="card"><h3>Sin suscripción</h3><p className="muted">Aún no existe una suscripción asociada a la empresa.</p></div>;
  return <div className="grid grid-3"><div className="card"><h3>Plan</h3><div className="kpi">{subscription.planCode}</div></div><div className="card"><h3>Estado</h3><div className="kpi">{subscription.status}</div></div><div className="card"><h3>Límite</h3><div className="kpi">{subscription.vehicleLimit||"—"}</div><p className="muted">unidades</p></div></div>
}
