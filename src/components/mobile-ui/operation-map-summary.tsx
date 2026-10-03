import Link from "next/link";
import type {OperationMapData} from "./operation-map-context";

export function OperationMapSummary({data,detail=false}:{data:OperationMapData|null;detail?:boolean}){
  if(!data?.journey)return <p className="mobile-v3-fixture-copy">{data?"Sin jornada asignada":"Contexto de jornada"}</p>;
  const snapshot=data.snapshot;
  if(!detail)return <div className="mobile-v3-map-summary">
    <div className="mobile-v3-map-identity"><span>{snapshot?.economicNumber||"Unidad asignada"} · {data.route?.name||"Sin ruta asignada"}</span><span>{data.journey.state}</span></div>
    <div className="mobile-v3-next-stop"><small>PRÓXIMA PARADA</small><strong>{snapshot?.nextStop?.name||"Sin siguiente parada proyectada"}</strong></div>
  </div>;
  const progress=snapshot?.progressPercent;
  return <div className="mobile-v3-map-detail">
    <div className="driver-live-kpis">
      <div><small>ETA</small><strong>{snapshot?.etaMinutes==null?"Sin estimación":snapshot.etaMinutes+" min"}</strong></div>
      <div><small>Velocidad</small><strong>{snapshot?.speedKmH==null?"Sin dato":snapshot.speedKmH.toFixed(0)+" km/h"}</strong></div>
      <div><small>Frescura GPS</small><strong>{snapshot?.freshness||"Sin reporte"}</strong></div>
    </div>
    {progress!=null?<div className="mobile-v3-route-progress"><span>Avance {progress.toFixed(1)}%</span><progress max={100} value={Math.max(0,Math.min(100,progress))} aria-label="Avance de ruta"/></div>:null}
    {snapshot?.nextStop?<p>{snapshot.nextStop.distanceRemainingM} m hasta la próxima parada</p>:null}
    <div className="mobile-v3-map-links"><Link className="mobile-v3-button" href="/operacion/navegacion">Ver ruta</Link><Link className="mobile-v3-button" href="/operacion/chat">Chat</Link><Link className="mobile-v3-button" href="/operacion/radio">Radio</Link></div>
  </div>;
}
