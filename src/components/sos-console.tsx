"use client";
import { useState } from "react";

export function SosConsole(){
  const [state,setState]=useState("Listo");

  async function send(){
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

    const response=await fetch("/api/incidents",{
      method:"POST",
      headers:{"content-type":"application/json"},
      body:JSON.stringify({type:"sos",message:"SOS desde operación móvil",...coordinates})
    });
    const data=await response.json().catch(()=>({}));
    setState(response.ok?(coordinates.latitude!=null?"SOS enviado con ubicación":"SOS enviado sin ubicación"):(data.error||"No se pudo enviar"));
  }

  return <div className="card grid">
    <button className="btn" onClick={()=>void send()} style={{minHeight:180,fontSize:38}}>SOS</button>
    <strong>{state}</strong>
    <p className="muted">ManeComb intenta adjuntar la coordenada actual; si el GPS no responde, la alerta se envía de todos modos.</p>
  </div>
}
