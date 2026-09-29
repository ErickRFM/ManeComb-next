"use client";
import { useEffect, useState } from "react";

export function PlatformMetrics(){
  const [data,setData]=useState<any>(null);
  const [error,setError]=useState("");

  useEffect(()=>{
    let mounted=true;
    const load=()=>fetch("/api/admin/metrics").then(async response=>{
      const body=await response.json();
      if(!response.ok)throw new Error(body.error||"No se pudieron cargar métricas");
      if(mounted)setData(body);
    }).catch(e=>mounted&&setError(e.message));
    void load();
    const timer=setInterval(()=>void load(),10_000);
    return()=>{mounted=false;clearInterval(timer)}
  },[]);

  if(error)return <div className="card" style={{color:"#fb7185"}}>{error}</div>;
  if(!data)return <div className="card muted">Cargando métricas...</div>;

  const telemetry=data.metrics?.timers?.find((item:any)=>item.name==="telemetry_capture_to_ingest_ms");
  const api=data.metrics?.timers?.find((item:any)=>item.name==="api_duration_ms");
  return <div className="grid grid-3">
    <div className="card"><span className="muted">Sockets</span><div className="kpi">{data.summary.socketsConnected}</div></div>
    <div className="card"><span className="muted">Solicitudes API</span><div className="kpi">{data.summary.apiRequests}</div></div>
    <div className="card"><span className="muted">Errores API</span><div className="kpi">{data.summary.apiErrorRatePercent}%</div><p className="muted">{data.summary.apiErrors} errores</p></div>
    <div className="card"><span className="muted">API p95</span><div className="kpi">{api?.p95ApproxMs??0} ms</div></div>
    <div className="card"><span className="muted">GPS captura→ingesta p95</span><div className="kpi">{telemetry?.p95ApproxMs??0} ms</div></div>
    <div className="card"><span className="muted">Cola</span><pre style={{whiteSpace:"pre-wrap"}}>{JSON.stringify(data.summary.queue,null,2)}</pre></div>
  </div>
}
