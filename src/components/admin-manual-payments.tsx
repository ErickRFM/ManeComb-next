"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { UiModal } from "@/src/components/ui-modal";
import { COMMERCIAL_PLANS } from "@/src/core/domain/commercial-plans";

export function AdminManualPayments(){
  const [items,setItems]=useState<any[]>([]);
  const [state,setState]=useState("Cargando pagos...");
  const [loading,setLoading]=useState(true),[error,setError]=useState(""),[busy,setBusy]=useState(false);
  const [reviewing,setReviewing]=useState<{item:any;status:"approved"|"rejected"}|null>(null);

  const load=useCallback(async()=>{
    setLoading(true);try{
    const response=await fetch("/api/admin/manual-payments");
    const data=await response.json();
    if(!response.ok)throw new Error(data.error||"No se pudieron cargar pagos");
    setItems(data.payments||[]);
    setState((data.payments||[]).length+" pendientes");setError("");
    }catch{setError("No se pudieron cargar pagos. Revisa tu conexión o tu acceso.")}finally{setLoading(false)}
  },[]);

  useEffect(()=>{void load().catch(error=>setState(error.message))},[load]);

  const total=useMemo(()=>items.reduce((sum,item)=>sum+Number(item.amountMxn||0),0),[items]);

  async function review(){
    if(!reviewing||busy)return;setBusy(true);setError("");try{
    setState(reviewing.status==="approved"?"Aprobando pago...":"Rechazando pago...");
    const response=await fetch("/api/admin/manual-payments/"+reviewing.item._id,{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({status:reviewing.status})});
    const data=await response.json();
    if(!response.ok){setError(data.error||"No se pudo revisar");return}
    setReviewing(null);setState("Pago revisado");await load();
    }catch{setError("No se pudo confirmar la revisión del pago. Consulta su estado antes de reintentar.")}finally{setBusy(false)}
  }

  return <div className="admin-payment-center">
    <section className="entity-metrics">
      <div><small>Pendientes</small><strong>{loading?"—":items.length}</strong></div>
      <div><small>Importe en revisión</small><strong>{loading?"—":"$"+total.toFixed(0)}</strong></div>
      <div><small>Moneda</small><strong>MXN</strong></div>
    </section>

    <div className="admin-payment-head"><span role="status">{loading?"Cargando pagos…":state}</span><button className="btn secondary" disabled={busy||loading} onClick={()=>void load()}>Actualizar pagos</button><small>Verifica el comprobante antes de activar la suscripción.</small></div>

    {error&&!reviewing?<p role="alert">{error}</p>:null}
    <div className="admin-payment-list">
      {items.map(item=>{
        const plan=COMMERCIAL_PLANS.find(value=>value.code===item.planCode);
        return <article className="admin-payment-row" key={item._id}>
          <span className="payment-icon pending">$</span>
          <div className="payment-copy"><strong>{plan?.label||item.planCode}</strong><small>{item.organizationName||item.organizationId||"Empresa"} · {item.createdAt?new Date(item.createdAt).toLocaleString():"Pendiente"}</small></div>
          <div className="payment-amount"><strong>{"$"+Number(item.amountMxn).toFixed(2)}</strong><small>MXN</small></div>
          <a className="entity-link" href={"/api/manual-payments/"+item._id+"/receipt"} target="_blank" rel="noreferrer">Comprobante ↗</a>
          <div className="entity-actions"><button disabled={busy} onClick={()=>setReviewing({item,status:"approved"})}>Aprobar</button><button disabled={busy} className="danger" onClick={()=>setReviewing({item,status:"rejected"})}>Rechazar</button></div>
        </article>;
      })}
      {!items.length&&!loading&&!error?<div className="empty-state"><strong>Sin pagos pendientes</strong><span>No hay comprobantes esperando conciliación manual.</span></div>:null}
    </div>

    <UiModal open={Boolean(reviewing)} onClose={()=>{if(!busy)setReviewing(null)}} title={reviewing?.status==="approved"?"Aprobar pago":"Rechazar pago"} description="Esta acción queda registrada en auditoría y modifica el estado comercial de la empresa.">
      {error?<p role="alert">{error}</p>:null}
      <div className="confirmation-content">
        <span className={"confirmation-icon "+(reviewing?.status==="rejected"?"danger":"")}>{reviewing?.status==="approved"?"✓":"!"}</span>
        <div><strong>{reviewing?.item?.planCode}</strong><p>{reviewing?("$"+Number(reviewing.item.amountMxn).toFixed(2)+" MXN"):""} · verifica el comprobante antes de continuar.</p></div>
      </div>
      <div className="form-actions"><button className="btn secondary" disabled={busy} onClick={()=>setReviewing(null)}>Cancelar</button><button disabled={busy} className={"btn "+(reviewing?.status==="rejected"?"danger":"")} onClick={()=>void review()}>{reviewing?.status==="approved"?"Confirmar aprobación":"Confirmar rechazo"}</button></div>
    </UiModal>
  </div>;
}
