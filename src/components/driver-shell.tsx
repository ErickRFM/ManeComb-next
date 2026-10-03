"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/src/components/theme-toggle";
import { useNetworkStatus } from "@/src/hooks/useNetworkStatus";
import {useCallback,useEffect,useRef,useState} from "react";
import type {IconName} from "@/src/components/ui/icon";
import {DriverTools} from "@/src/components/driver-tools";
import {JourneyPanel} from "@/src/components/journey-panel";
import {DriverConsole} from "@/src/components/driver-console";
import {PushOptIn} from "@/src/components/push-opt-in";
import {BrandLogo} from "@/src/components/brand-logo";
import {MobileTopBar} from "@/src/components/mobile-ui/mobile-top-bar";
import {MobileBottomNav} from "@/src/components/mobile-ui/mobile-bottom-nav";
import {ContextSheet} from "@/src/components/mobile-ui/context-sheet";
import type {SheetLevel} from "@/src/components/mobile-ui/sheet-handle";
import {OperationMapProvider,useOperationMapData,useSetMapFeedbackHost} from "@/src/components/mobile-ui/operation-map-context";
import {OperationMapSummary} from "@/src/components/mobile-ui/operation-map-summary";

const tabs=[
  {label:"Mapa",href:"/operacion",key:"map",exact:true},
  {label:"Chat",href:"/operacion/chat",key:"chat"},
  {label:"Radio",href:"/operacion/radio",key:"radio"},
  {label:"Alertas",href:"/operacion/alertas",key:"alert"},
  {label:"Más",href:"/operacion/mas",key:"more"}
];

export function DriverShell({children}:{children:React.ReactNode}){
  return <OperationMapProvider><DriverShellContent>{children}</DriverShellContent></OperationMapProvider>;
}

function DriverShellContent({children}:{children:React.ReactNode}){
  const pathname=usePathname();
  const online=useNetworkStatus();
  const data=useOperationMapData();
  const setFeedbackHost=useSetMapFeedbackHost();
  const [level,setLevel]=useState<SheetLevel>("compact");
  const openContext=useCallback(()=>setLevel("expanded"),[]);
  const previousJourney=useRef<string|null>(null);
  const isMap=pathname==="/operacion";
  useEffect(()=>{
    const identity=data?.journey?data.journey.id+":"+data.journey.vehicleId:null;
    if(previousJourney.current&&identity&&previousJourney.current!==identity)setLevel("compact");
    if(identity)previousJourney.current=identity;
  },[data?.journey?.id,data?.journey?.vehicleId]);
  return <div className="driver-shell mobile-v3-operation" data-map-home={isMap}>
    <MobileTopBar leading={<Link href="/operacion" className="driver-brand" aria-label="ManeComb Operación"><BrandLogo size="sm"/></Link>} title={<><span>Operación</span><span className="mobile-v3-browser-network" aria-live="polite">{online===null?"Consultando red":online?"Red disponible":"Sin red"}</span></>} actions={<><Link href="/operacion/sos" className="mobile-v3-button" aria-label="Reportar emergencia SOS">SOS</Link><ThemeToggle/></>}/>
    <main id="main-content" className="driver-workspace" tabIndex={-1}>{children}
      <aside className="mobile-v3-operation-context" hidden={!isMap}>
        <ContextSheet id="operation-context" title="Contexto de operación" level={level} onLevelChange={setLevel} resetKey={data?.journey?data.journey.id+":"+data.journey.vehicleId:null} summary={<><OperationMapSummary data={data}/><div ref={setFeedbackHost}/></>}>
          <OperationMapSummary data={data} detail/>
          <section hidden={!isMap} aria-label="Controles de jornada y GPS"><DriverTools onOpen={openContext}><JourneyPanel/><DriverConsole/><PushOptIn/></DriverTools></section>
        </ContextSheet>
      </aside>
    </main>
    <MobileBottomNav items={tabs.map(tab=>({label:tab.label,href:tab.href,icon:tab.key as IconName,active:tab.exact?pathname===tab.href:pathname.startsWith(tab.href)}))}/>
  </div>;
}
