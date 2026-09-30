"use client";
import { useEffect, useState } from "react";

export function HealthPanel(){
  const [health,setHealth]=useState<any>(null);
  const [error,setError]=useState("");
  useEffect(()=>{let mounted=true;fetch("/api/health/ready").then(async response=>{
    const data=await response.json(); if(mounted)setHealth(data);
  }).catch((e)=>mounted&&setError(e.message));return()=>{mounted=false}},[]);
  if(error) return <div className="card" style={{color:"#fb7185"}}>{error}</div>;
  if(!health) return <div className="card muted">Consultando readiness...</div>;
  return <div className="grid grid-3">
    <div className="card"><h3>Readiness</h3><div className="kpi">{health.status}</div><p className="muted">{health.timestamp}</p></div>
    <div className="card"><h3>MongoDB</h3><div className="kpi">{health.database?.ok?"OK":"DOWN"}</div><p className="muted">{health.database?.error||"Conectado"}</p></div>
    <div className="card"><h3>Redis</h3><div className="kpi">{health.redis?.ok?"OK":"DOWN"}</div><p className="muted">{health.redis?.error||"Conectado"}</p></div>
    <div className="card"><h3>Integraciones</h3><pre style={{whiteSpace:"pre-wrap"}}>{JSON.stringify(health.integrations,null,2)}</pre></div>
    <div className="card"><h3>Faltantes</h3><p className="muted">{health.missing?.length?health.missing.join(", "):"Ninguno"}</p></div>
  </div>
}
