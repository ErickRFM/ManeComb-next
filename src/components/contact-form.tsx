"use client";
import { FormEvent, useState } from "react";

export function ContactForm(){
  const [state,setState]=useState("");
  const [busy,setBusy]=useState(false);
  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault(); setBusy(true); setState("");
    const form=event.currentTarget;
    const raw=Object.fromEntries(new FormData(form).entries());
    const body={...raw,fleetSize:raw.fleetSize?Number(raw.fleetSize):undefined};
    const response=await fetch("/api/commercial/leads",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});
    const data=await response.json().catch(()=>({}));
    setBusy(false);
    if(!response.ok) return setState(data.error||"No se pudo enviar");
    form.reset();
    setState("Solicitud recibida. Te contactaremos.");
  }
  return <form className="card grid form-stack" style={{maxWidth:620}} onSubmit={submit}>
    <label>Nombre<input className="input" name="name" autoComplete="name" placeholder="Tu nombre" required/></label>
    <label>Correo<input className="input" name="email" type="email" inputMode="email" autoComplete="email" spellCheck={false} placeholder="correo@empresa.com" required/></label>
    <label>Teléfono<input className="input" name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="Teléfono"/></label>
    <label>Número de unidades<input className="input" name="fleetSize" type="number" min="1" placeholder="Ej. 4"/></label>
    <label>Mensaje<textarea className="input" name="message" rows={5} placeholder="Cuéntanos sobre tu operación"/></label>
    {state?<p className="muted" style={{margin:0}}>{state}</p>:null}
    <button className="btn" disabled={busy}>{busy?"Enviando...":"Enviar"}</button>
  </form>
}
