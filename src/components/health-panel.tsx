"use client";

import { useEffect, useMemo, useState } from "react";

export function HealthPanel(){
  const [health,setHealth]=useState<any>(null);
  const [error,setError]=useState("");

  useEffect(()=>{
    let mounted=true;
    const load=()=>fetch("/api/health/ready").then(async response=>{
      const data=await response.json();
      if(mounted)setHealth(data);
    }).catch(e=>mounted&&setError(e.message));
    void load();
    const timer=setInterval(()=>void load(),15_000);
    return()=>{mounted=false;clearInterval(timer)};
  },[]);

  const integrations=useMemo(()=>health?Object.entries(health.integrations||{}):[],[health]);

  if(error)return <div className="system-error-card">{error}</div>;
  if(!health)return <div className="admin-health-skeleton"><div/><div/><div/></div>;

  const ok=health.status==="ok";
  return <section className="admin-health">
    <div className={"readiness-hero "+(ok?"good":"degraded")}>
      <div>
        <span className="eyebrow">READINESS</span>
        <h2>{ok?"Plataforma lista":"Plataforma degradada"}</h2>
        <p>{ok?"Las dependencias obligatorias responden correctamente.":"Hay servicios o credenciales que requieren atención antes de producción."}</p>
      </div>
      <div className="readiness-status"><span className={"system-orb "+(ok?"good":"bad")}/><strong>{String(health.status).toUpperCase()}</strong><small>{new Date(health.timestamp).toLocaleTimeString()}</small></div>
    </div>

    <div className="service-health-grid">
      <div className={"service-health-card "+(health.database?.ok?"good":"bad")}>
        <div className="service-health-head"><span>DB</span><small>{health.database?.ok?"OPERATIVO":"ERROR"}</small></div>
        <strong>MongoDB</strong><p>{health.database?.error||"Conexión activa"}</p>
      </div>
      <div className={"service-health-card "+(health.redis?.ok?"good":"bad")}>
        <div className="service-health-head"><span>RD</span><small>{health.redis?.ok?"OPERATIVO":"ERROR"}</small></div>
        <strong>Redis</strong><p>{health.redis?.error||"Realtime, rate-limit y colas disponibles"}</p>
      </div>
      <div className={"service-health-card "+(health.rtc?.ready?"good":"warn")}>
        <div className="service-health-head"><span>RTC</span><small>{health.rtc?.ready?"TURN READY":"STUN ONLY"}</small></div>
        <strong>WebRTC</strong><p>{health.rtc?.mode||"Sin información"}</p>
      </div>
    </div>

    <div className="integration-panel">
      <div className="integration-panel-head"><div><strong>Integraciones de producción</strong><small>{integrations.filter(([,ready])=>ready).length}/{integrations.length} configuradas</small></div>{health.missing?.length?<span className="health-chip warn">{health.missing.length} faltantes</span>:<span className="health-chip good">completo</span>}</div>
      <div className="integration-grid">
        {integrations.map(([name,ready])=><div className="integration-row" key={name}><span className={"integration-dot "+(ready?"good":"bad")}/><strong>{name}</strong><small>{ready?"Configurado":"Pendiente"}</small></div>)}
      </div>
    </div>
  </section>;
}
