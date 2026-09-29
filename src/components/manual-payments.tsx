"use client";
import { FormEvent, useCallback, useEffect, useState } from "react";

const plans=[
  {code:"fleet-2",label:"2 combis",amount:99},
  {code:"fleet-4",label:"4 combis",amount:159},
  {code:"fleet-6",label:"6 combis",amount:289},
  {code:"fleet-8",label:"8 combis",amount:449},
  {code:"fleet-12",label:"12 combis",amount:729}
];

export function ManualPayments(){
  const [payments,setPayments]=useState<any[]>([]);
  const [state,setState]=useState("Cargando...");
  const [planCode,setPlanCode]=useState("fleet-2");
  const plan=plans.find(item=>item.code===planCode)!;
  const load=useCallback(async()=>{const r=await fetch("/api/manual-payments");const d=await r.json();if(!r.ok)throw new Error(d.error||"No se pudieron cargar");setPayments(d.payments||[]);setState((d.payments||[]).length+" comprobantes")},[]);
  useEffect(()=>{void load().catch(e=>setState(e.message))},[load]);

  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    const form=event.currentTarget;
    const raw=Object.fromEntries(new FormData(form).entries());
    const r=await fetch("/api/manual-payments",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({
      planCode,
      amountMxn:plan.amount,
      receiptUrl:raw.receiptUrl,
      idempotencyKey:crypto.randomUUID()
    })});
    const d=await r.json();
    if(!r.ok)return setState(d.error||"No se pudo enviar");
    form.reset();
    await load();
  }

  return <div className="grid">
    <form className="card grid" onSubmit={submit}>
      <strong>Subir comprobante</strong>
      <select className="input" value={planCode} onChange={(e)=>setPlanCode(e.target.value)}>{plans.map(item=><option value={item.code} key={item.code}>{item.label} · {item.amount} MXN/mes</option>)}</select>
      <input className="input" value={plan.amount+" MXN"} readOnly/>
      <input className="input" name="receiptUrl" type="url" placeholder="URL del comprobante" required/>
      <button className="btn">Enviar a revisión</button>
    </form>
    <span className="muted">{state}</span>
    {payments.map(p=><div className="card" key={p._id}><div className="status-row"><strong>{p.planCode} · {Number(p.amountMxn).toFixed(2)} MXN</strong><span className="badge">{p.status}</span></div><a className="brand" href={p.receiptUrl} target="_blank" rel="noreferrer">Ver comprobante</a></div>)}
  </div>
}
