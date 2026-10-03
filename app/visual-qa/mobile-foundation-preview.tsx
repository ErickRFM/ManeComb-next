"use client";

import { useState } from "react";
import { MobileSection } from "@/src/components/mobile-ui/mobile-section";
import { MobileStatus, type MobileTone } from "@/src/components/mobile-ui/mobile-status";

export function MobileFoundationPreview(){
  const [tone,setTone]=useState<MobileTone>("neutral");
  return <div className="driver-shell mobile-v3-fixture">
    <main id="main-content" className="mobile-v3-fixture-main" tabIndex={-1}>
      <h1 className="mobile-v3-fixture-title">Mobile V3 Foundation — fixture QA</h1>
      <p className="mobile-v3-fixture-copy">Componentes reales con entradas sintéticas de QA. Esta superficie no representa datos, permisos o acciones de operación.</p>
      <MobileSection title="Estados de presentación">
        <div className="mobile-v3-fixture-stack"><MobileStatus label="Estado de prueba QA" tone={tone}/><MobileStatus label="Anuncio de prueba QA" icon="alert" announce/></div>
        <div className="mobile-v3-fixture-stack">{(["neutral","success","warning","danger"] as const).map(value=><button type="button" key={value} className="mobile-v3-button" onClick={()=>setTone(value)}>Probar tono {value}</button>)}</div>
      </MobileSection>
    </main>
  </div>;
}
