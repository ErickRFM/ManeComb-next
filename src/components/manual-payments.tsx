"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { uploadManeCombFile } from "@/src/lib/client-upload";
import { COMMERCIAL_PLANS } from "@/src/core/domain/commercial-plans";
import { UiModal } from "@/src/components/ui-modal";

export function ManualPayments(){
  const [payments,setPayments]=useState<any[]>([]);
  const [state,setState]=useState("Cargando comprobantes...");
  const [planCode,setPlanCode]=useState("fleet-2");
  const [busy,setBusy]=useState(false);
  const [modalOpen,setModalOpen]=useState(false);
  const [loading,setLoading]=useState(true),[error,setError]=useState("");
  const idempotencyKey=useRef<string|null>(null);
  const plan=COMMERCIAL_PLANS.find(item=>item.code===planCode)||COMMERCIAL_PLANS[0];

  const load=useCallback(async()=>{
    setLoading(true);try{
    const response=await fetch("/api/manual-payments");
    const data=await response.json();
    if(!response.ok)throw new Error(data.error||"No se pudieron cargar comprobantes");
    setPayments(data.payments||[]);
    setState((data.payments||[]).length+" comprobantes");setError("");
    }catch{setError("No se pudieron cargar los comprobantes. Revisa tu conexión o tu acceso.")}finally{setLoading(false)}
  },[]);

  useEffect(()=>{void load().catch(error=>setState(error.message))},[load]);

  const counts=useMemo(()=>({
    pending:payments.filter(item=>item.status==="pending").length,
    approved:payments.filter(item=>item.status==="approved").length,
    rejected:payments.filter(item=>item.status==="rejected").length
  }),[payments]);

  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();if(busy)return;setError("");
    idempotencyKey.current ||= crypto.randomUUID();
    setBusy(true);setState("Subiendo comprobante...");
    try{
      const form=event.currentTarget;
      const raw=new FormData(form);
      const file=raw.get("receipt");
      if(!(file instanceof File)||file.size===0)throw new Error("Selecciona un comprobante");
      const uploaded=await uploadManeCombFile(file,"payment");
      const response=await fetch("/api/manual-payments",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({
        planCode,
        amountMxn:plan.monthlyMxn,
        receiptUrl:uploaded.url,
        receiptPublicId:uploaded.publicId,
        receiptResourceType:uploaded.resourceType,
        receiptBytes:uploaded.bytes,
        receiptMimeType:uploaded.mimeType,
        receiptFileName:uploaded.fileName,
        idempotencyKey:idempotencyKey.current
      })});
      const data=await response.json();
      if(!response.ok)throw new Error(data.error||"No se pudo enviar");
      form.reset();idempotencyKey.current=null;setModalOpen(false);setState("Comprobante enviado a revisión");await load();
    }catch{setError("No se pudo confirmar el comprobante. Revisa su estado antes de reintentar.")}
    finally{setBusy(false)}
  }

  return <section className="payment-history">
    <div className="payment-history-head">
      <div><span className="eyebrow">PAGOS MANUALES</span><h2>Comprobantes y conciliación</h2><p>Utiliza esta vía sólo cuando el cobro no se realiza por Mercado Pago.</p></div>
      <button className="btn" onClick={()=>setModalOpen(true)}>+ Subir comprobante</button>
    </div>

    <div className="entity-metrics payment-metrics">
      <div><small>Pendientes</small><strong>{loading?"—":counts.pending}</strong></div>
      <div><small>Aprobados</small><strong>{loading?"—":counts.approved}</strong></div>
      <div><small>Rechazados</small><strong>{loading?"—":counts.rejected}</strong></div>
    </div>

    <div className="payment-list">
      {error&&!modalOpen?<p role="alert">{error}</p>:null}
      <div className="payment-list-head"><span role="status">{loading?"Cargando comprobantes…":state}</span><button className="btn secondary" disabled={busy||loading} onClick={()=>void load()}>Actualizar comprobantes</button><span>Historial reciente</span></div>
      {payments.length?payments.map(payment=>{
        const paymentPlan=COMMERCIAL_PLANS.find(item=>item.code===payment.planCode);
        return <article className="payment-row" key={payment._id}>
          <span className={"payment-icon "+payment.status}>$</span>
          <div className="payment-copy"><strong>{paymentPlan?.label||payment.planCode}</strong><small>{payment.createdAt?new Date(payment.createdAt).toLocaleString():"Comprobante registrado"}</small></div>
          <div className="payment-amount"><strong>{"$"+Number(payment.amountMxn).toFixed(2)}</strong><small>MXN</small></div>
          <span className={"state-badge "+(payment.status==="approved"?"active":payment.status==="rejected"?"archived":"maintenance")}>{payment.status}</span>
          <a className="entity-link" href={"/api/manual-payments/"+payment._id+"/receipt"} target="_blank" rel="noreferrer">Comprobante ↗</a>
        </article>;
      }):!loading&&!error?<div className="empty-state"><strong>Sin comprobantes</strong><span>Los pagos enviados aparecerán aquí con su estado de revisión.</span></div>:null}
    </div>

    <UiModal open={modalOpen} onClose={()=>{if(!busy)setModalOpen(false)}} title="Subir comprobante" description="El importe esperado lo calcula ManeComb a partir del plan seleccionado.">
      <form className="form-stack" onSubmit={submit}>
        {error?<p role="alert">{error}</p>:null}
        <label>Plan<select className="input" value={planCode} onChange={e=>setPlanCode(e.target.value)}>{COMMERCIAL_PLANS.map(item=><option value={item.code} key={item.code}>{item.label+" · $"+item.monthlyMxn+" MXN/mes"}</option>)}</select></label>
        <div className="payment-expected"><span>Importe esperado</span><strong>{"$"+plan.monthlyMxn+" MXN"}</strong></div>
        <label>Comprobante<input className="input" name="receipt" type="file" accept="image/*,application/pdf" required/></label>
        <div className="form-actions"><button type="button" className="btn secondary" onClick={()=>setModalOpen(false)}>Cancelar</button><button className="btn" disabled={busy}>{busy?"Subiendo...":"Enviar a revisión"}</button></div>
      </form>
    </UiModal>
  </section>;
}
