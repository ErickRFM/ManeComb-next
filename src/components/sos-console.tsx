"use client";
import { useState } from "react";

export function SosConsole(){
  const [state,setState]=useState("Listo");
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState(false);

  async function send(){
    if(busy)return;setBusy(true);setError(false);
    setState("Obteniendo ubicación...");
    let coordinates:{latitude?:number;longitude?:number}={};
    try{
      const position=await new Promise<GeolocationPosition>((resolve,reject)=>{
        navigator.geolocation.getCurrentPosition(resolve,reject,{enableHighAccuracy:true,timeout:8000,maximumAge:5000});
      });
      coordinates={latitude:position.coords.latitude,longitude:position.coords.longitude};
    }catch{
      setState("GPS no disponible · enviando SOS sin coordenadas");
    }

    try{const response=await fetch("/api/incidents",{
      method:"POST",
      headers:{"content-type":"application/json"},
      body:JSON.stringify({type:"sos",message:"SOS desde operación móvil",...coordinates})
    });
    const data=await response.json().catch(()=>({}));
    setState(response.ok?(coordinates.latitude!=null?"SOS enviado con ubicación":"SOS enviado sin ubicación"):(data.error||"No se pudo enviar"));
    setError(!response.ok);
    }catch{setError(true);setState("No se pudo enviar el SOS. Revisa la conexión y vuelve a intentar.")}
    finally{setBusy(false)}
  }

  return <div className="card grid">
    <button className="btn" disabled={busy} onClick={()=>void send()} style={{minHeight:180,fontSize:38}}>{busy?"Enviando SOS…":"SOS"}</button>
    <strong role={error?"alert":"status"}>{state}</strong>
    <p className="muted">ManeComb intenta adjuntar la coordenada actual; si el GPS no responde, la alerta se envía de todos modos.</p>
  </div>
}
