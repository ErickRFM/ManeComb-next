"use client";
import { useState } from "react";
export function SosConsole(){
  const [state,setState]=useState("Listo");
  async function send(){
    setState("Enviando...");
    const response=await fetch("/api/incidents",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({type:"sos",message:"SOS desde operación móvil"})});
    setState(response.ok?"SOS enviado a central":"No se pudo enviar");
  }
  return <div className="card grid"><button className="btn" onClick={()=>void send()} style={{minHeight:180,fontSize:38}}>SOS</button><strong>{state}</strong><p className="muted">El incidente queda asociado a la organización y al conductor autenticado.</p></div>
}
