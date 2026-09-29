"use client";
import { FormEvent, useCallback, useEffect, useState } from "react";

type Journey={_id:string;vehicleId:string;state:"ASSIGNED"|"READY"|"RUNNING"|"PAUSED"|"FINISHED"|"CANCELLED";checklist?:any};

export function JourneyPanel(){
  const [journey,setJourney]=useState<Journey|null>(null);
  const [state,setState]=useState("Cargando jornada...");

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

  useEffect(()=>{void load().catch(e=>setState(e.message))},[load]);

  async function action(action:string,extra:Record<string,unknown>={}){
    if(!journey)return;
    const response=await fetch("/api/journeys",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({journeyId:journey._id,action,...extra})});
    const data=await response.json();
    if(!response.ok)return setState(data.error||"No se pudo actualizar");
    setJourney(data.journey);
    setState("Jornada "+data.journey.state);
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

  if(!journey) return <div className="card"><strong>{state}</strong><p className="muted">El despacho debe asignar conductor y unidad antes de iniciar.</p></div>;

  return <div className="card grid">
    <div className="status-row"><strong>Jornada</strong><span className="badge">{journey.state}</span></div>
    {journey.state==="ASSIGNED"?<form className="grid" onSubmit={ready}>
      <strong>Checklist pre-operacional</strong>
      {["brakes","tires","lights","fuel","cleanliness"].map(name=><label key={name}><input type="checkbox" name={name} required/> {name}</label>)}
      <input className="input" name="odometerStartKm" type="number" min="0" step=".1" placeholder="Odómetro inicial (km)" required/>
      <button className="btn">Confirmar checklist</button>
    </form>:null}
    {journey.state==="READY"?<button className="btn" onClick={()=>void action("start")}>Iniciar jornada</button>:null}
    {journey.state==="RUNNING"?<div style={{display:"flex",gap:8}}><button className="btn secondary" onClick={()=>void action("pause")}>Pausar</button><button className="btn" onClick={()=>void action("finish")}>Finalizar</button></div>:null}
    {journey.state==="PAUSED"?<div style={{display:"flex",gap:8}}><button className="btn" onClick={()=>void action("resume")}>Reanudar</button><button className="btn secondary" onClick={()=>void action("finish")}>Finalizar</button></div>:null}
    <span className="muted">{state}</span>
  </div>
}
