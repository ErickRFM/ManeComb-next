"use client";

import { useState } from "react";
import { MobileSection } from "@/src/components/mobile-ui/mobile-section";
import { MobileStatus, type MobileTone } from "@/src/components/mobile-ui/mobile-status";
import { MobileTopBar } from "@/src/components/mobile-ui/mobile-top-bar";
import { MobileBottomNav, type MobileNavItem } from "@/src/components/mobile-ui/mobile-bottom-nav";
import { BrandLogo } from "@/src/components/brand-logo";
import { Icon } from "@/src/components/ui/icon";

export function MobileFoundationPreview(){
  const [tone,setTone]=useState<MobileTone>("neutral");
  const [active,setActive]=useState("/operacion");
  const [longTitle,setLongTitle]=useState(false);
  const items:MobileNavItem[]=[
    {href:"/operacion",label:"Mapa",icon:"map",active:active==="/operacion"},
    {href:"/operacion/chat",label:"Chat",icon:"chat",active:active==="/operacion/chat"},
    {href:"/operacion/radio",label:"Radio",icon:"radio",active:active==="/operacion/radio"},
    {href:"/operacion/alertas",label:"Alertas",icon:"alert",active:active==="/operacion/alertas"},
    {href:"/operacion/mas",label:"Más",icon:"more",active:active==="/operacion/mas"}
  ];
  return <div className="driver-shell mobile-v3-fixture">
    <MobileTopBar leading={<button className="mobile-v3-button" type="button" aria-label="Menú de prueba QA"><Icon name="menu"/></button>}
      title={<><BrandLogo size="sm"/><span>{longTitle?"Contexto de presentación de prueba con un título muy largo para comprobar lectura y ajuste sin recortar información":"Foundation QA"}</span></>}
      actions={<button className="mobile-v3-button" type="button" aria-label="Alertas de prueba QA"><Icon name="alert"/></button>}/>
    <main id="main-content" className="mobile-v3-fixture-main" tabIndex={-1}>
      <h1 className="mobile-v3-fixture-title">Mobile V3 Foundation — fixture QA</h1>
      <p className="mobile-v3-fixture-copy">Componentes reales con entradas sintéticas de QA. Esta superficie no representa datos, permisos o acciones de operación.</p>
      <MobileSection title="Estados de presentación">
        <div className="mobile-v3-fixture-stack"><MobileStatus label="Estado de prueba QA" tone={tone}/><MobileStatus label="Anuncio de prueba QA" icon="alert" announce/></div>
        <div className="mobile-v3-fixture-stack">{(["neutral","success","warning","danger"] as const).map(value=><button type="button" key={value} className="mobile-v3-button" onClick={()=>setTone(value)}>Probar tono {value}</button>)}</div>
      </MobileSection>
      <MobileSection title="Controles exclusivos de fixture">
        <div className="mobile-v3-fixture-stack"><button className="mobile-v3-button" type="button" onClick={()=>setActive("/operacion/radio")}>Probar activo Radio</button><button className="mobile-v3-button" type="button" onClick={()=>setLongTitle(value=>!value)}>Probar título largo QA</button></div>
      </MobileSection>
    </main>
    <MobileBottomNav items={items} label="Navegación QA de operación"/>
  </div>;
}
