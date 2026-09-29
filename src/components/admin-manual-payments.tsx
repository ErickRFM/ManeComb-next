"use client";
import { useCallback, useEffect, useState } from "react";

export function AdminManualPayments(){
  const [items,setItems]=useState<any[]>([]);
  const [state,setState]=useState("Cargando...");
  const load=useCallback(async()=>{
    const response=await fetch("/api/admin/manual-payments");
    const data=await response.json();
    if(!response.ok)throw new Error(data.error||"No se pudieron cargar pagos");
    setItems(data.payments||[]);
    setState((data.payments||[]).length+" pendientes");
  },[]);
  useEffect(()=>{void load().catch(e=>setState(e.message))},[load]);

  async function review(id:string,status:"approved"|"rejected"){
    const response=await fetch("/api/admin/manual-payments/"+id,{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({status})});
    const data=await response.json();
    if(!response.ok)return setState(data.error||"No se pudo revisar");
    await load();
  }

  return <div className="grid"><span className="muted">{state}</span>
    {items.length===0?<div className="card muted">No hay pagos pendientes.</div>:items.map(item=><div className="card" key={item._id}>
      <div className="status-row"><strong>{item.planCode} · {Number(item.amountMxn).toFixed(2)} MXN</strong><span className="badge">pending</span></div>
      <p><a className="brand" href={"/api/manual-payments/"+item._id+"/receipt"} target="_blank" rel="noreferrer">Abrir comprobante</a></p>
      <div style={{display:"flex",gap:8}}><button className="btn" onClick={()=>void review(item._id,"approved")}>Aprobar</button><button className="btn secondary" onClick={()=>void review(item._id,"rejected")}>Rechazar</button></div>
    </div>)}
  </div>
}
