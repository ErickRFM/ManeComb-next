"use client";
import Link from "next/link";
import { useState } from "react";

export function CheckoutPanel({planId}:{planId:string}){
  const [state,setState]=useState("");
  const [busy,setBusy]=useState(false);

  async function checkout(){
    setBusy(true);setState("");
    const key=crypto.randomUUID();
    const response=await fetch("/api/commercial/checkout",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({planId,idempotencyKey:key})});
    const data=await response.json().catch(()=>({}));
    setBusy(false);
    if(response.status===401){
      setState("Inicia sesión o registra tu empresa para contratar.");
      return;
    }
    if(!response.ok)return setState(data.error||"No se pudo abrir Mercado Pago");
    if(data.initPoint) window.location.assign(data.initPoint);
  }

  return <div className="card grid">
    <p className="muted">La tarifa se valida en el servidor. El cobro recurrente se crea con Mercado Pago y el webhook activa la suscripción.</p>
    {state?<p style={{color:"#fb7185"}}>{state}</p>:null}
    <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
      <button className="btn" onClick={()=>void checkout()} disabled={busy}>{busy?"Abriendo Mercado Pago...":"Continuar al pago"}</button>
      <Link className="btn secondary" href="/registro">Registrar empresa</Link>
      <Link className="btn secondary" href="/login">Iniciar sesión</Link>
    </div>
  </div>
}
