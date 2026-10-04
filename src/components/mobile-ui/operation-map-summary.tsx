import Link from "next/link";
import type {OperationMapData} from "./operation-map-context";
import {distanceLabel,journeyStateLabel} from "./journey-presentation";
import {MobileFreshness} from "./mobile-freshness";

export function OperationMapSummary({data,detail=false}:{data:OperationMapData|null;detail?:boolean}){
  if(!data?.journey)return <p className="mobile-v3-fixture-copy">{data?"Sin jornada asignada":"Contexto de jornada"}</p>;
  const snapshot=data.snapshot;
  if(!detail)return <div className="mobile-v3-map-summary">
    <div className="mobile-v3-map-identity"><span><strong>{snapshot?.economicNumber||"Unidad asignada"}</strong><small>{data.route?.name||"Sin ruta asignada"}</small></span><span>{journeyStateLabel(data.journey.state)}</span></div>
    <div className="mobile-v3-next-stop"><small>PRÓXIMA PARADA</small><strong>{snapshot?.nextStop?.name||"Sin siguiente parada proyectada"}</strong></div>
  </div>;
  const progress=snapshot?.progressPercent;
  return <div className="mobile-v3-map-detail">
    <div className="driver-live-kpis">
      <div><small>ETA</small><strong>{snapshot?.etaMinutes==null||!Number.isFinite(snapshot.etaMinutes)?"Sin estimación":snapshot.etaMinutes+" min"}</strong></div>
      <div><small>Distancia restante</small><strong>{distanceLabel(snapshot?.distanceRemainingM)}</strong></div>
      <div><small>Velocidad</small><strong>{snapshot?.speedKmH==null?"Sin dato":snapshot.speedKmH.toFixed(0)+" km/h"}</strong></div>
    </div>
    {progress!=null&&Number.isFinite(progress)?<div className="mobile-v3-route-progress"><span>Avance {progress.toFixed(1)}%</span><progress max={100} value={Math.max(0,Math.min(100,progress))} aria-label="Avance de ruta"/></div>:<p>Avance no disponible</p>}
    {snapshot?.nextStop?<p>{distanceLabel(snapshot.nextStop.distanceRemainingM)} hasta la próxima parada</p>:null}
    {snapshot?<MobileFreshness freshness={snapshot.freshness} recordedAt={snapshot.recordedAt}/>:<p>Sin reporte GPS</p>}
    {data.route?<div className="mobile-v3-route-metadata">{data.route.origin||data.route.destination?<p>{data.route.origin||"Origen no disponible"} → {data.route.destination||"Destino no disponible"}</p>:null}{Number.isFinite(data.route.revision)?<span>Revisión {data.route.revision}</span>:null}</div>:null}
    <div className="mobile-v3-map-links"><Link className="mobile-v3-button" href="/operacion/navegacion">Ver ruta</Link><Link className="mobile-v3-button" href="/operacion/chat">Chat</Link><Link className="mobile-v3-button" href="/operacion/radio">Radio</Link></div>
  </div>;
}
