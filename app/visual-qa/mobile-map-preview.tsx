"use client";

import {useState} from "react";
import {ContextSheet} from "@/src/components/mobile-ui/context-sheet";
import {OperationMapSummary} from "@/src/components/mobile-ui/operation-map-summary";
import type {SheetLevel} from "@/src/components/mobile-ui/sheet-handle";
import type {OperationMapData} from "@/src/components/mobile-ui/operation-map-context";

// Only imported by the VISUAL_QA-guarded route. Never an operational fallback.
const fixture:OperationMapData={
  journey:{id:"qa-only",vehicleId:"qa-only-unit",routeId:"qa-only-route",state:"RUNNING",startedAt:null},
  route:{id:"qa-only-route",name:"Ruta fixture QA",revision:1,geometry:[],stops:[]},
  snapshot:{vehicleId:"qa-only-unit",economicNumber:"QA-01",status:"active",freshness:"live",recordedAt:"2026-10-03T12:00:00.000Z",latitude:19.3,longitude:-98.2,speedKmH:20,progressPercent:25,etaMinutes:4,nextStop:{name:"Parada fixture QA",order:1,latitude:19.31,longitude:-98.21,distanceRemainingM:1000}} as OperationMapData["snapshot"]
};
export function MobileMapPreview(){
  const [level,setLevel]=useState<SheetLevel>("compact");
  const [follow,setFollow]=useState(true);
  return <div className="mobile-v3-operation" data-map-home="true">
    <div className="driver-map-shell"><div className="visual-map-grid driver-map-canvas" role="img" aria-label="Mapa simulado — fixture QA"><span className="driver-live-marker visual-marker m2">QA-01</span></div><div className="driver-map-top"><button className="driver-follow" onClick={()=>setFollow(value=>!value)}>{follow?"Siguiendo":"Seguir"}</button></div></div>
    <aside className="mobile-v3-operation-context"><ContextSheet id="qa-operation-context" title="Contexto de operación — fixture QA" level={level} onLevelChange={setLevel} summary={<OperationMapSummary data={fixture}/>}><p className="mobile-v3-fixture-copy">Fixture QA de presentación. Sin acciones de jornada ni datos de producción.</p><OperationMapSummary data={fixture} detail/></ContextSheet></aside>
  </div>;
}
