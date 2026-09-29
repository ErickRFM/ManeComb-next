"use client";
import { useState } from "react";
function base64UrlToUint8Array(value:string){
  const padding="=".repeat((4-(value.length%4))%4);
  const base64=(value+padding).replace(/-/g,"+").replace(/_/g,"/");
  const raw=atob(base64);
  return Uint8Array.from([...raw].map(char=>char.charCodeAt(0)));
}
export function PushOptIn(){
  const [state,setState]=useState("");
  const [busy,setBusy]=useState(false);
  async function enable(){
    setBusy(true);setState("");
    try{
      const key=process.env.NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY;
      if(!key)throw new Error("Web Push no está configurado");
      if(!("serviceWorker" in navigator)||!("PushManager" in window))throw new Error("Este dispositivo no soporta Web Push");
      const permission=await Notification.requestPermission();
      if(permission!=="granted")throw new Error("Permiso de notificaciones no concedido");
      const registration=await navigator.serviceWorker.ready;
      const subscription=await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:base64UrlToUint8Array(key)});
      const json=subscription.toJSON();
      const response=await fetch("/api/push/subscriptions",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({endpoint:json.endpoint,keys:json.keys})});
      const data=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(data.error||"No se pudo registrar el dispositivo");
      setState("Notificaciones activadas");
    }catch(error){setState(error instanceof Error?error.message:"No se pudieron activar")}
    finally{setBusy(false)}
  }
  return <div className="card"><div className="status-row"><div><strong>Notificaciones</strong><p className="muted" style={{marginBottom:0}}>Alertas operativas aunque ManeComb no esté al frente.</p></div><button className="btn secondary" onClick={()=>void enable()} disabled={busy}>{busy?"Activando...":"Activar"}</button></div>{state?<p className="muted">{state}</p>:null}</div>
}
