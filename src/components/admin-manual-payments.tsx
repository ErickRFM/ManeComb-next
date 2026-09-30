"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { UiModal } from "@/src/components/ui-modal";
import { COMMERCIAL_PLANS } from "@/src/core/domain/commercial-plans";

export function AdminManualPayments(){
  const [items,setItems]=useState<any[]>([]);
  const [state,setState]=useState("Cargando pagos...");
  const [reviewing,setReviewing]=useState<{item:any;status:"approved"|"rejected"}|null>(null);

  const load=useCallback(async()=>{
    const response=await fetch("/api/admin/manual-payments");
    const data=await response.json();
    if(!response.ok)throw new Error(data.error||"No se pudieron cargar pagos");
    setItems(data.payments||[]);
    setState((data.payments||[]).length+" pendientes");
  },[]);

  useEffect(()=>{void load().catch(error=>setState(error.message))},[load]);

  const total=useMemo(()=>items.reduce((sum,item)=>sum+Number(item.amountMxn||0),0),[items]);

  async function review(){
    if(!reviewing)return;
    setState(reviewing.status==="approved"?"Aprobando pago...":"Rechazando pago...");
    const response=await fetch("/api/admin/manual-payments/"+reviewing.item._id,{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({status:reviewing.status})});
    const data=await response.json();
    if(!response.ok){setState(data.error||"No se pudo revisar");return}
    setReviewing(null);setState("Pago revisado");await load();
  }

  return <div className="admin-payment-center">
    <section className="entity-metrics">
      <div><small>Pendientes</small><strong>{items.length}</strong></div>
      <div><small>Importe en revisión</small><strong>{"$"+total.toFixed(0)}</strong></div>
      <div><small>Moneda</small><strong>MXN</strong></div>
    </section>

    <div className="admin-payment-head"><span>{state}</span><small>La aprobación activa la suscripción con autoridad del servidor.</small></div>

    <div className="admin-payment-list">
      {items.map(item=>{
        const plan=COMMERCIAL_PLANS.find(value=>value.code===item.planCode);
        return <article className="admin-payment-row" key={item._id}>
          <span className="payment-icon pending">$</span>
          <div className="payment-copy"><strong>{plan?.label||item.planCode}</strong><small>{item.organizationName||item.organizationId||"Empresa"} · {item.createdAt?new Date(item.createdAt).toLocaleString():"Pendiente"}</small></div>
          <div className="payment-amount"><strong>{"$"+Number(item.amountMxn).toFixed(2)}</strong><small>MXN</small></div>
          <a className="entity-link" href={"/api/manual-payments/"+item._id+"/receipt"} target="_blank" rel="noreferrer">Comprobante ↗</a>
          <div className="entity-actions"><button onClick={()=>setReviewing({item,status:"approved"})}>Aprobar</button><button className="danger" onClick={()=>setReviewing({item,status:"rejected"})}>Rechazar</button></div>
        </article>;
      })}
      {!items.length?<div className="empty-state"><strong>Sin pagos pendientes</strong><span>No hay comprobantes esperando conciliación manual.</span></div>:null}
    </div>

    <UiModal open={Boolean(reviewing)} onClose={()=>setReviewing(null)} title={reviewing?.status==="approved"?"Aprobar pago":"Rechazar pago"} description="Esta acción queda registrada en auditoría y modifica el estado comercial de la empresa.">
      <div className="confirmation-content">
        <span className={"confirmation-icon "+(reviewing?.status==="rejected"?"danger":"")}>{reviewing?.status==="approved"?"✓":"!"}</span>
        <div><strong>{reviewing?.item?.planCode}</strong><p>{reviewing?("$"+Number(reviewing.item.amountMxn).toFixed(2)+" MXN"):""} · verifica el comprobante antes de continuar.</p></div>
      </div>
      <div className="form-actions"><button className="btn secondary" onClick={()=>setReviewing(null)}>Cancelar</button><button className={"btn "+(reviewing?.status==="rejected"?"danger":"")} onClick={()=>void review()}>{reviewing?.status==="approved"?"Confirmar aprobación":"Confirmar rechazo"}</button></div>
    </UiModal>
  </div>;
}
