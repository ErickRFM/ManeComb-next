"use client";
import { useCallback, useEffect, useState } from "react";

export function RouteCandidates(){
  const [routes,setRoutes]=useState<any[]>([]);
  const [candidates,setCandidates]=useState<any[]>([]);
  const [state,setState]=useState("Cargando...");

  const load=useCallback(async()=>{
    const [routesResponse,candidatesResponse]=await Promise.all([fetch("/api/routes"),fetch("/api/routes/candidates")]);
    const [routesData,candidatesData]=await Promise.all([routesResponse.json(),candidatesResponse.json()]);
    if(!routesResponse.ok)throw new Error(routesData.error||"No se pudieron cargar rutas");
    if(!candidatesResponse.ok)throw new Error(candidatesData.error||"No se pudieron cargar candidatos");
    setRoutes(routesData.routes||[]);
    setCandidates(candidatesData.candidates||[]);
    setState((candidatesData.candidates||[]).filter((item:any)=>item.status==="candidate").length+" pendientes");
  },[]);

  useEffect(()=>{void load().catch(error=>setState(error.message))},[load]);

  async function generate(routeId:string){
    if(!routeId)return;
    setState("Analizando trazas GPS...");
    const response=await fetch("/api/routes/candidates",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({routeId})});
    const data=await response.json();
    if(!response.ok)return setState(data.error||"No se pudo generar candidato");
    await load();
  }

  async function review(candidateId:string,action:"approved"|"rejected"){
    const response=await fetch("/api/routes/candidates/"+candidateId,{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({action})});
    const data=await response.json();
    if(!response.ok)return setState(data.error||"No se pudo revisar");
    await load();
  }

  return <div className="grid">
    <div className="card grid">
      <strong>Generar candidato desde jornadas terminadas</strong>
      <select className="input" defaultValue="" onChange={(event)=>void generate(event.target.value)}>
        <option value="" disabled>Selecciona una ruta</option>
        {routes.filter(route=>route.status!=="archived").map(route=><option value={route._id} key={route._id}>{route.name}</option>)}
      </select>
      <span className="muted">{state}</span>
    </div>
    <div className="grid grid-3">{candidates.map(candidate=><div className="card grid" key={candidate._id}>
      <div className="status-row"><strong>Candidato</strong><span className="badge">{candidate.status}</span></div>
      <span className="muted">Muestras: {candidate.sampleCount} · confianza {(Number(candidate.confidence||0)*100).toFixed(0)}%</span>
      <span className="muted">Puntos simplificados: {(candidate.geometry||[]).length}</span>
      {candidate.status==="candidate"?<div style={{display:"flex",gap:8}}><button className="btn" onClick={()=>void review(candidate._id,"approved")}>Aprobar</button><button className="btn secondary" onClick={()=>void review(candidate._id,"rejected")}>Rechazar</button></div>:null}
    </div>)}</div>
  </div>
}
