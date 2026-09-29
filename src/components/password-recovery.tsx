"use client";
import { FormEvent, useState } from "react";
export function PasswordRecovery(){
  const [state,setState]=useState("");
  const [busy,setBusy]=useState(false);
  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();setBusy(true);setState("");
    const email=String(new FormData(event.currentTarget).get("email")||"");
    const response=await fetch("/api/auth/recover",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({email})});
    setBusy(false);
    if(!response.ok)return setState("No se pudo procesar la solicitud");
    setState("Si la cuenta existe, recibirás un enlace de recuperación.");
  }
  return <form className="card grid" style={{maxWidth:520}} onSubmit={submit}>
    <input className="input" name="email" type="email" placeholder="Correo" required/>
    <button className="btn" disabled={busy}>{busy?"Procesando...":"Enviar enlace"}</button>
    {state?<p className="muted" style={{margin:0}}>{state}</p>:null}
  </form>
}
