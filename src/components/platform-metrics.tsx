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
    return()=>{mounted=false;clearInterval(timer)};
  },[]);

  if(error)return <div className="system-error-card">{error}</div>;
  if(!data)return <div className="admin-health-skeleton"><div/><div/><div/></div>;

  const telemetry=data.metrics?.timers?.find((item:any)=>item.name==="telemetry_capture_to_ingest_ms");
  const api=data.metrics?.timers?.find((item:any)=>item.name==="api_duration_ms");
  const queue=data.summary?.queue||{};
  const queueBacklog=Number(queue.waiting||0)+Number(queue.delayed||0)+Number(queue.active||0);

  return <section className="runtime-metrics">
    <div className="runtime-metrics-head"><div><span className="eyebrow">RUNTIME</span><h2>Operación de plataforma</h2></div><span className="live-badge"><span className="live-dot"/>Actualiza cada 10 s</span></div>
    <div className="metric-strip admin-metrics">
      <div className="metric-card"><span className="metric-label">Sockets</span><div className="metric-value">{data.summary.socketsConnected}</div><div className="metric-delta">Conexiones realtime</div></div>
      <div className="metric-card"><span className="metric-label">Error rate</span><div className="metric-value">{data.summary.apiErrorRatePercent}%</div><div className={"metric-delta "+(data.summary.apiErrorRatePercent>2?"bad":"good")}>{data.summary.apiErrors} errores / {data.summary.apiRequests} req</div></div>
      <div className="metric-card"><span className="metric-label">API p95</span><div className="metric-value">{api?.p95ApproxMs??0}<small> ms</small></div><div className="metric-delta">Latencia aproximada</div></div>
      <div className="metric-card"><span className="metric-label">GPS p95</span><div className="metric-value">{telemetry?.p95ApproxMs??0}<small> ms</small></div><div className="metric-delta">Captura → ingesta</div></div>
    </div>

    <div className="queue-panel">
      <div><span className="queue-orb">{queueBacklog}</span><div><strong>Communication Queue</strong><small>waiting + delayed + active</small></div></div>
      <div className="queue-states">
        {["waiting","active","delayed","failed","completed"].map(key=><div key={key}><small>{key}</small><strong>{queue[key]??0}</strong></div>)}
      </div>
    </div>
  </section>;
}
