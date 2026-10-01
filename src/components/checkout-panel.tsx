"use client";
import Link from "next/link";
import { useRef,useState } from "react";

export function CheckoutPanel({planId}:{planId:string}){
  const [state,setState]=useState("");
  const [busy,setBusy]=useState(false);
  const key=useRef<string|null>(null);

  async function checkout(){
    if(busy)return;setBusy(true);setState("");
    key.current ||= crypto.randomUUID();
    try{const response=await fetch("/api/commercial/checkout",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({planId,idempotencyKey:key.current})});
    const data=await response.json().catch(()=>({}));
    if(response.status===401){
      setState("Inicia sesión o registra tu empresa para contratar.");
      return;
    }
    if(!response.ok)return setState(data.error||"No se pudo abrir Mercado Pago");
    if(data.initPoint) window.location.assign(data.initPoint);
    else setState("No se pudo confirmar el enlace de pago. Vuelve a consultar antes de reintentar.");
    }catch{setState("No se pudo confirmar la solicitud de pago. Revisa tu conexión y vuelve a intentar.")}
    finally{setBusy(false)}
  }

  return <div className="card grid">
    <p className="muted">Continúa en Mercado Pago para contratar tu suscripción. Podrás consultar su estado en Facturación.</p>
    {state?<p className="danger-text" role="alert">{state}</p>:null}
    <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
      <button className="btn" onClick={()=>void checkout()} disabled={busy}>{busy?"Abriendo Mercado Pago...":"Continuar al pago"}</button>
      <Link className="btn secondary" href={"/registro?plan="+encodeURIComponent(planId)}>Registrar empresa</Link>
      <Link className="btn secondary" href={"/login?plan="+encodeURIComponent(planId)}>Iniciar sesión</Link>
    </div>
  </div>
}
