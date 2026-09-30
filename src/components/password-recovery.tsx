"use client";
import { FormEvent, useState } from "react";
export function PasswordRecovery(){
  const [state,setState]=useState("");
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState(false);
  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();setBusy(true);setState("");setError(false);
    const email=String(new FormData(event.currentTarget).get("email")||"");
    try{const response=await fetch("/api/auth/recover",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({email})});
    if(!response.ok){setError(true);return setState("No se pudo procesar la solicitud")}
    setState("Si la cuenta existe, recibirás un enlace de recuperación.");
    }catch{setError(true);setState("No se pudo enviar la solicitud. Revisa la conexión y vuelve a intentar.")}
    finally{setBusy(false)}
  }
  return <form className="card grid" style={{maxWidth:520}} onSubmit={submit}>
    <label className="grid">Correo electrónico<input className="input" name="email" type="email" autoComplete="email" placeholder="Correo" required/></label>
    <button className="btn" disabled={busy}>{busy?"Procesando...":"Enviar enlace"}</button>
    {state?<p className={error?"danger-text":"muted"} role={error?"alert":"status"} style={{margin:0}}>{state}</p>:null}
  </form>
}
