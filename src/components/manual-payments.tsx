"use client";
import { FormEvent, useCallback, useEffect, useState } from "react";
export function ManualPayments(){
  const [payments,setPayments]=useState<any[]>([]);
  const [state,setState]=useState("Cargando...");
  const load=useCallback(async()=>{const r=await fetch("/api/manual-payments");const d=await r.json();if(!r.ok)throw new Error(d.error||"No se pudieron cargar");setPayments(d.payments||[]);setState((d.payments||[]).length+" comprobantes")},[]);
  useEffect(()=>{void load().catch(e=>setState(e.message))},[load]);
  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();const form=event.currentTarget;const raw=Object.fromEntries(new FormData(form).entries());
    const r=await fetch("/api/manual-payments",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({amountMxn:Number(raw.amountMxn),receiptUrl:raw.receiptUrl})});
    const d=await r.json();if(!r.ok)return setState(d.error||"No se pudo enviar");form.reset();await load();
  }
  return <div className="grid"><form className="card grid" onSubmit={submit}><strong>Subir comprobante</strong><input className="input" name="amountMxn" type="number" min="1" step=".01" placeholder="Importe MXN" required/><input className="input" name="receiptUrl" type="url" placeholder="URL del comprobante" required/><button className="btn">Enviar a revisión</button></form><span className="muted">{state}</span>{payments.map(p=><div className="card" key={p._id}><div className="status-row"><strong>{Number(p.amountMxn).toFixed(2)} MXN</strong><span className="badge">{p.status}</span></div><a className="brand" href={p.receiptUrl} target="_blank" rel="noreferrer">Ver comprobante</a></div>)}</div>
}
