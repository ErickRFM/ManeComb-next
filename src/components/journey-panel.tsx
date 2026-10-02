"use client";
import { FormEvent, useCallback, useEffect, useState } from "react";
import {useSocket} from "@/src/hooks/useSocket";
import {isNativeLocationAvailable,stopNativeLocation} from "@/src/lib/native-location";
import {shouldStopNativeTracking} from "@/src/lib/native-tracking-contract";

type Journey={_id:string;vehicleId:string;state:"ASSIGNED"|"READY"|"RUNNING"|"PAUSED"|"FINISHED"|"CANCELLED";checklist?:any};

export function JourneyPanel(){
  const socket=useSocket();
  const [journey,setJourney]=useState<Journey|null>(null);
  const [state,setState]=useState("Cargando jornada...");
  const [busy,setBusy]=useState(false);const [error,setError]=useState("");
  const [retry,setRetry]=useState(0);

  const load=useCallback(async()=>{
    const response=await fetch("/api/journeys");
    const data=await response.json();
    if(!response.ok) throw new Error(data.error||"No se pudo cargar la jornada");
    const current=(data.journeys||[])[0]||null;
    setJourney(current);
    if(current){
      localStorage.setItem("manecomb.vehicleId",String(current.vehicleId));
      localStorage.setItem("manecomb.journeyId",String(current._id));
      setState("Jornada "+current.state);
    }else{
      localStorage.removeItem("manecomb.journeyId");
      setState("Sin jornada asignada");
    }
  },[]);

  useEffect(()=>{
    const refresh=()=>void load().catch(()=>setState("No se pudo cargar la jornada. Vuelve a intentar."));
    refresh();socket.on("connect",refresh);socket.on("journey:update",refresh);
    return()=>{socket.off("connect",refresh);socket.off("journey:update",refresh)};
  },[load,socket,retry]);

  async function action(action:string,extra:Record<string,unknown>={}){
    if(!journey||busy)return;setBusy(true);setError("");
    try{
      const response=await fetch("/api/journeys",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({journeyId:journey._id,action,...extra})});
      const data=await response.json();
      if(!response.ok)return setError(data.error||"No se pudo actualizar");
      setJourney(data.journey);
      setState("Jornada "+data.journey.state);

      if(isNativeLocationAvailable()&&shouldStopNativeTracking(action,data.journey.state)){
        try{
          await stopNativeLocation();
          setState("Jornada "+data.journey.state+" · GPS nativo detenido");
        }catch{
          setError("La jornada cambió, pero no se pudo confirmar la detención local del GPS. El servidor bloqueará nueva telemetría.");
        }
      }
    }catch{
      setError("No se pudo actualizar la jornada. Revisa la conexión y vuelve a intentar.");
    }finally{
      setBusy(false);
    }
  }

  async function ready(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    const form=new FormData(event.currentTarget);
    await action("ready",{checklist:{
      brakes:form.get("brakes")==="on",
      tires:form.get("tires")==="on",
      lights:form.get("lights")==="on",
      fuel:form.get("fuel")==="on",
      cleanliness:form.get("cleanliness")==="on",
      odometerStartKm:Number(form.get("odometerStartKm")||0)
    }});
  }

  if(!journey) return <div className="card"><strong role="status">{state}</strong><p className="muted">El despacho debe asignar conductor y unidad antes de iniciar.</p><button className="btn secondary" onClick={()=>setRetry(value=>value+1)}>Consultar jornada</button></div>;

  return <div className="card grid">
    <div className="status-row"><strong>Jornada</strong><span className="badge">{journey.state}</span></div>
    {error?<p role="alert">{error}</p>:null}
    <fieldset disabled={busy} className="route-editor-fields">
    {journey.state==="ASSIGNED"?<form className="grid" onSubmit={ready}>
      <strong>Checklist pre-operacional</strong>
      {[["brakes","Frenos"],["tires","Llantas"],["lights","Luces"],["fuel","Combustible"],["cleanliness","Limpieza"]].map(([name,label])=><label key={name}><input type="checkbox" name={name} required/> {label}</label>)}
      <label>Odómetro inicial (km)<input className="input" name="odometerStartKm" type="number" min="0" step=".1" required/></label>
      <button className="btn">Confirmar checklist</button>
    </form>:null}
    {journey.state==="READY"?<button className="btn" onClick={()=>void action("start")}>Iniciar jornada</button>:null}
    {journey.state==="RUNNING"?<div style={{display:"flex",gap:8}}><button className="btn secondary" onClick={()=>void action("pause")}>Pausar</button><button className="btn" onClick={()=>void action("finish")}>Finalizar</button></div>:null}
    {journey.state==="PAUSED"?<div style={{display:"flex",gap:8}}><button className="btn" onClick={()=>void action("resume")}>Reanudar</button><button className="btn secondary" onClick={()=>void action("finish")}>Finalizar</button></div>:null}
    </fieldset><span className="muted" role="status">{busy?"Actualizando jornada…":state}</span>
  </div>
}
