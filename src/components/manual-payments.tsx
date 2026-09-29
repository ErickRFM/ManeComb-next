"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { uploadManeCombFile } from "@/src/lib/client-upload";

export function ManualPayments(){
  const [payments,setPayments]=useState<any[]>([]);
  const [state,setState]=useState("Cargando...");
  const [busy,setBusy]=useState(false);
  const fileRef=useRef<HTMLInputElement|null>(null);

  const load=useCallback(async()=>{
    const response=await fetch("/api/manual-payments");
    const data=await response.json();
    if(!response.ok)throw new Error(data.error||"No se pudieron cargar");
    setPayments(data.payments||[]);
    setState((data.payments||[]).length+" comprobantes");
  },[]);

  useEffect(()=>{void load().catch(error=>setState(error.message))},[load]);

  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    const form=event.currentTarget;
    const amountMxn=Number(new FormData(form).get("amountMxn"));
    const file=fileRef.current?.files?.[0];
    if(!file)return setState("Selecciona un comprobante");

    setBusy(true);
    setState("Cargando comprobante...");
    try{
      const uploaded=await uploadManeCombFile(file,"payment");
      setState("Enviando a revisión...");
      const response=await fetch("/api/manual-payments",{
        method:"POST",
        headers:{"content-type":"application/json"},
        body:JSON.stringify({
          amountMxn,
          receiptUrl:uploaded.url,
          storagePublicId:uploaded.publicId,
          resourceType:uploaded.resourceType,
          bytes:uploaded.bytes,
          mimeType:uploaded.mimeType,
          fileName:uploaded.fileName
        })
      });
      const data=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(data.error||"No se pudo enviar");
      form.reset();
      setState("Comprobante enviado");
      await load();
    }catch(error){
      setState(error instanceof Error?error.message:"No se pudo enviar");
    }finally{
      setBusy(false);
    }
  }

  return <div className="grid">
    <form className="card grid" onSubmit={submit}>
      <strong>Subir comprobante</strong>
      <input className="input" name="amountMxn" type="number" min="1" max="1000000" step=".01" placeholder="Importe MXN" required/>
      <input ref={fileRef} className="input" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" required/>
      <button className="btn" disabled={busy}>{busy?"Procesando...":"Enviar a revisión"}</button>
    </form>
    <span className="muted">{state}</span>
    {payments.map(payment=><div className="card" key={payment._id}>
      <div className="status-row">
        <strong>{Number(payment.amountMxn).toFixed(2)} MXN</strong>
        <span className="badge">{payment.status}</span>
      </div>
      <a className="brand" href={payment.receiptUrl} target="_blank" rel="noreferrer">{payment.fileName||"Ver comprobante"}</a>
    </div>)}
  </div>
}
