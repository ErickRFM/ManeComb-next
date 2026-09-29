"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { OperationalUnitSnapshot } from "@/src/core/contracts/telemetry";

type Incident={_id:string;type:string;status:string;message?:string;createdAt?:string};
type Journey={_id:string;state:string;vehicleId:string};

export function PortalDashboardOverview(){
  const [units,setUnits]=useState<OperationalUnitSnapshot[]>([]);
  const [incidents,setIncidents]=useState<Incident[]>([]);
  const [journeys,setJourneys]=useState<Journey[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");

  useEffect(()=>{
    let active=true;
    void Promise.all([
      fetch("/api/locations/live").then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.error||"No se pudo cargar la flota");return d.units||[]}),
      fetch("/api/incidents").then(async r=>{const d=await r.json();if(r.status===403)return [];if(!r.ok)throw new Error(d.error||"No se pudieron cargar incidencias");return d.incidents||[]}),
      fetch("/api/journeys").then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.error||"No se pudieron cargar jornadas");return d.journeys||[]})
    ]).then(([fleet,alerts,ops])=>{
      if(!active)return;
      setUnits(fleet);setIncidents(alerts);setJourneys(ops);setLoading(false);
    }).catch(e=>{if(active){setError(e.message);setLoading(false)}});
    return()=>{active=false};
  },[]);

  const metrics=useMemo(()=>{
    const live=units.filter(unit=>unit.freshness==="live").length;
    const degraded=units.filter(unit=>["stale","lost"].includes(unit.freshness)).length;
    const offRoute=units.filter(unit=>unit.isOffRoute).length;
    const openIncidents=incidents.filter(item=>item.status!=="resolved").length;
    const running=journeys.filter(item=>item.state==="RUNNING").length;
    return {live,degraded,offRoute,openIncidents,running,total:units.length};
  },[units,incidents,journeys]);

  const alerts=useMemo(()=>{
    const rows:Array<{level:"danger"|"warn"|"info";title:string;copy:string;href:string}>=[];
    for(const unit of units){
      if(unit.isOffRoute)rows.push({level:"danger",title:unit.economicNumber+" fuera de ruta",copy:(unit.distanceFromRouteM??0)+" m fuera del corredor",href:"/portal/monitoreo"});
      else if(unit.freshness==="lost")rows.push({level:"danger",title:unit.economicNumber+" sin GPS",copy:"La unidad perdió telemetría en vivo.",href:"/portal/monitoreo"});
      else if(unit.freshness==="stale")rows.push({level:"warn",title:unit.economicNumber+" GPS retrasado",copy:"La última ubicación ya no es fresca.",href:"/portal/monitoreo"});
    }
    for(const incident of incidents.filter(item=>item.status!=="resolved").slice(0,4)){
      rows.push({level:incident.type==="sos"?"danger":"warn",title:(incident.type==="sos"?"SOS":"Incidencia")+" abierta",copy:incident.message||"Requiere seguimiento operativo.",href:"/portal/incidencias"});
    }
    return rows.slice(0,6);
  },[units,incidents]);

  if(loading)return <div className="dashboard-skeleton grid"><div className="skeleton-block"/><div className="skeleton-block large"/></div>;
  if(error)return <div className="card" style={{color:"var(--danger)"}}>{error}</div>;

  return <div className="dashboard-grid">
    <section className="metric-strip">
      <div className="metric-card"><span className="metric-label">Flota</span><div className="metric-value">{metrics.total}</div><div className="metric-delta">{metrics.running} jornadas en curso</div></div>
      <div className="metric-card"><span className="metric-label">GPS en vivo</span><div className="metric-value">{metrics.live}</div><div className={"metric-delta "+(metrics.degraded?"warn":"good")}>{metrics.degraded?metrics.degraded+" requieren atención":"Telemetría estable"}</div></div>
      <div className="metric-card"><span className="metric-label">Fuera de ruta</span><div className="metric-value">{metrics.offRoute}</div><div className={"metric-delta "+(metrics.offRoute?"bad":"good")}>{metrics.offRoute?"Revisar corredor":"Sin desvíos confirmados"}</div></div>
      <div className="metric-card"><span className="metric-label">Incidencias</span><div className="metric-value">{metrics.openIncidents}</div><div className={"metric-delta "+(metrics.openIncidents?"warn":"good")}>{metrics.openIncidents?"Pendientes de resolver":"Operación limpia"}</div></div>
    </section>

    <section className="dashboard-main-card">
      <div className="dashboard-card-head">
        <div><span className="eyebrow">OPERACIÓN EN VIVO</span><h2>Estado de la flota</h2><p>Prioriza lo que requiere atención y entra al mapa cuando necesites actuar.</p></div>
        <Link className="btn" href="/portal/monitoreo">Abrir monitoreo</Link>
      </div>
      <div className="fleet-glance">
        {units.length?units.slice(0,8).map(unit=><Link href="/portal/monitoreo" className="fleet-glance-row" key={unit.vehicleId}>
          <div className={"unit-status-dot "+(unit.isOffRoute||unit.freshness==="lost"?"danger":unit.freshness==="stale"?"warn":"good")}/>
          <div className="fleet-glance-copy"><strong>{unit.economicNumber}</strong><span>{unit.routeName||"Sin ruta asignada"}</span></div>
          <div className="fleet-glance-meta"><span>{unit.speedKmH.toFixed(0)} km/h</span><small>{unit.freshness}</small></div>
          <div className="fleet-glance-meta"><span>{unit.etaMinutes==null?"—":unit.etaMinutes+" min"}</span><small>ETA</small></div>
        </Link>):<div className="empty-state"><strong>Sin unidades con telemetría</strong><span>Las unidades aparecerán aquí al iniciar una jornada.</span></div>}
      </div>
    </section>

    <aside className="dashboard-alerts-card">
      <div className="dashboard-card-head compact"><div><span className="eyebrow">PRIORIDAD</span><h2>Alertas operativas</h2></div><Link href="/portal/incidencias">Ver todas</Link></div>
      <div className="alert-stack">
        {alerts.length?alerts.map((alert,index)=><Link href={alert.href} key={index} className={"alert-row "+alert.level}>
          <span className="alert-indicator"/>
          <div><strong>{alert.title}</strong><p>{alert.copy}</p></div>
          <span className="alert-arrow">›</span>
        </Link>):<div className="empty-state compact"><strong>Sin alertas críticas</strong><span>La operación no reporta incidencias activas.</span></div>}
      </div>
    </aside>

    <section className="quick-actions-card">
      <div className="dashboard-card-head compact"><div><span className="eyebrow">ATAJOS</span><h2>Acciones frecuentes</h2></div></div>
      <div className="quick-actions-grid">
        <Link href="/portal/unidades" className="quick-action"><span>FL</span><div><strong>Agregar unidad</strong><small>Alta y mantenimiento</small></div></Link>
        <Link href="/portal/rutas" className="quick-action"><span>RT</span><div><strong>Editar rutas</strong><small>Paradas y geometría</small></div></Link>
        <Link href="/portal/conductores" className="quick-action"><span>CH</span><div><strong>Asignar conductor</strong><small>Activación y jornadas</small></div></Link>
        <Link href="/portal/documentos" className="quick-action"><span>DC</span><div><strong>Revisar documentos</strong><small>Vigencias y aprobación</small></div></Link>
      </div>
    </section>
  </div>;
}
