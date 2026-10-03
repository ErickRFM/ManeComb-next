import { notFound } from "next/navigation";
import { PortalShell } from "@/src/components/portal-shell";
import { AdminShell } from "@/src/components/admin-shell";
import { DriverShell } from "@/src/components/driver-shell";
import { VisualQaModal } from "@/src/components/visual-qa-modal";
import { Navigation } from "@/src/components/navigation";
import { MarketingHero } from "@/src/components/marketing/marketing-hero";
import { MarketingProductStory } from "@/src/components/marketing/marketing-product-story";
import { MarketingBento } from "@/src/components/marketing/marketing-bento";
import { MarketingProcess } from "@/src/components/marketing/marketing-process";
import { MarketingFaq } from "@/src/components/marketing/marketing-faq";
import { MarketingFinalCta } from "@/src/components/marketing/marketing-final-cta";
import { MarketingFooter } from "@/src/components/marketing/marketing-footer";
import { PlanCards } from "@/src/components/plan-cards";
import { Reveal } from "@/src/components/ui/reveal";
import { OperationAuthLayout } from "@/src/components/operation-auth-layout";
import { AuthForm } from "@/src/components/auth-form";
import { MobileFoundationPreview } from "../mobile-foundation-preview";
import { ActivationForm } from "@/src/components/activation-form";
import { PasswordRecovery } from "@/src/components/password-recovery";
import { PasswordReset } from "@/src/components/password-reset";
import { MfaForm } from "@/src/components/mfa-form";
import { OperationSessionLoading } from "@/src/components/operation-session-loading";
import { MobileMapPreview } from "../mobile-map-preview";

const allowed=new Set(["portal","admin","driver","forms","marketing","operation-auth","mobile-foundation","operation-activation","operation-recovery","operation-reset","operation-mfa","operation-bootstrap"]);

export default async function VisualQaPage({params}:{params:Promise<{surface:string}>}){
  if(process.env.VISUAL_QA!=="1")notFound();
  const {surface}=await params;
  if(!allowed.has(surface))notFound();
  if(surface==="mobile-foundation")return <MobileFoundationPreview/>;
  if(surface==="operation-bootstrap")return <OperationSessionLoading/>;
  if(surface==="operation-activation")return <OperationAuthLayout active="activate"><div className="operation-activation-copy"><h1>Activa tu cuenta</h1><p>Usa la llave que te compartió el responsable de tu línea.</p></div><ActivationForm/></OperationAuthLayout>;
  if(surface==="operation-recovery")return <OperationAuthLayout active="recovery"><div className="operation-activation-copy"><h1>Recuperar acceso</h1><p>Solicita un enlace para restablecer tu contraseña.</p></div><PasswordRecovery/></OperationAuthLayout>;
  if(surface==="operation-reset")return <OperationAuthLayout active="recovery"><div className="operation-activation-copy"><h1>Nueva contraseña</h1><p>Al cambiar la contraseña se revocan todas las sesiones activas.</p></div><PasswordReset token="visual-qa-only"/></OperationAuthLayout>;
  if(surface==="operation-mfa")return <OperationAuthLayout active="recovery"><div className="operation-activation-copy"><h1>Verificación de administrador</h1><p>Confirma el código de tu aplicación de autenticación.</p></div><MfaForm/></OperationAuthLayout>;

  if(surface==="portal")return <PortalShell initialProfile={{name:"QA Portal",roles:["owner"]}}><VisualPortal/></PortalShell>;
  if(surface==="admin")return <AdminShell><VisualAdmin/></AdminShell>;
  if(surface==="driver")return <DriverShell><MobileMapPreview/></DriverShell>;
  if(surface==="marketing")return <VisualMarketing/>;
  if(surface==="operation-auth")return <VisualOperationAuth/>;
  return <><VisualForms/><VisualQaModal/></>;
}

function VisualPortal(){
  const units=["C-1","C-3","C-5","C-7","C-9"];
  return <section className="module-section module-wide visual-qa-page">
    <header className="module-header"><div><span className="eyebrow">FLEET VIEW</span><h1 className="module-title">Monitoreo en vivo</h1><p className="module-copy">Fixture de QA visual para mapa, lista, filtros y panel contextual.</p></div></header>
    <div className="metric-strip">
      <div className="metric-card"><span className="metric-label">Flota</span><div className="metric-value">12</div><div className="metric-delta good">10 en vivo</div></div>
      <div className="metric-card"><span className="metric-label">GPS perdido</span><div className="metric-value">1</div><div className="metric-delta warn">Requiere atención</div></div>
      <div className="metric-card"><span className="metric-label">Fuera de ruta</span><div className="metric-value">1</div><div className="metric-delta bad">C-5</div></div>
      <div className="metric-card"><span className="metric-label">Incidencias</span><div className="metric-value">2</div><div className="metric-delta">Abiertas</div></div>
    </div>
    <div className="fleet-toolbar visual-toolbar"><div className="fleet-search"><span>⌕</span><input aria-label="Buscar unidad" placeholder="Buscar unidad o ruta..."/></div><div className="fleet-filters"><button className="active">Todas <span>12</span></button><button>En vivo <span>10</span></button><button>Atención <span>2</span></button></div><button className="camera-mode active">◎ Auto</button></div>
    <div className="fleet-stage visual-fleet-stage">
      <aside className="fleet-list-panel"><div className="fleet-panel-heading"><div><strong>Flota</strong><span>5 visibles</span></div><span className="live-badge"><span className="live-dot"/>Live</span></div><div className="fleet-list-scroll">{units.map((unit,index)=><button className={"fleet-list-item "+(index===2?"selected":"")} key={unit}><span className={"fleet-list-state "+(index===2?"danger":"good")}/><span className="fleet-list-copy"><strong>{unit}</strong><small>Centro → Terminal</small></span><span className="fleet-list-stats"><strong>{24+index}</strong><small>km/h</small></span><span className="fleet-list-stats"><strong>{8+index}</strong><small>min ETA</small></span></button>)}</div></aside>
      <div className="visual-map-grid" role="img" aria-label="Mapa simulado"><span className="fleet-marker good visual-marker m1">C1</span><span className="fleet-marker danger visual-marker m2">C5</span><span className="fleet-marker good visual-marker m3">C9</span></div>
      <aside className="unit-detail-panel"><div className="unit-detail-head"><div><span className="unit-status-dot danger"/><div><strong>C-5</strong><small>Centro → Terminal</small></div></div><button className="icon-action" aria-label="Cerrar detalle">×</button></div><div className="unit-detail-status"><span className="health-chip good">live</span><span className="health-chip danger">Fuera de ruta</span></div><div className="unit-detail-grid"><div><small>Velocidad</small><strong>28 km/h</strong></div><div><small>Avance</small><strong>63%</strong></div><div><small>ETA</small><strong>11 min</strong></div><div><small>Corredor</small><strong>246 m</strong></div></div><div className="next-stop-card"><small>PRÓXIMA PARADA</small><strong>Mercado Norte</strong><span>420 m restantes</span></div></aside>
    </div>
  </section>;
}

function VisualAdmin(){
  return <section className="module-section module-wide visual-qa-page">
    <header className="module-header"><div><span className="eyebrow">CONTROL CENTER</span><h1 className="module-title">Salud de plataforma</h1><p className="module-copy">Fixture de readiness, métricas e integraciones.</p></div></header>
    <div className="readiness-hero good"><div><span className="eyebrow">READINESS</span><h2>Plataforma lista</h2><p>Las dependencias obligatorias responden correctamente.</p></div><div className="readiness-status"><span className="system-orb good"/><strong>OK</strong><small>18:23</small></div></div>
    <div className="service-health-grid"><div className="service-health-card good"><div className="service-health-head"><span>DB</span><small>OPERATIVO</small></div><strong>MongoDB</strong><p>Conexión activa</p></div><div className="service-health-card good"><div className="service-health-head"><span>RD</span><small>OPERATIVO</small></div><strong>Redis</strong><p>Realtime y colas disponibles</p></div><div className="service-health-card good"><div className="service-health-head"><span>RTC</span><small>TURN READY</small></div><strong>WebRTC</strong><p>turn_dynamic+stun</p></div></div>
    <div className="metric-strip admin-metrics"><div className="metric-card"><span className="metric-label">Sockets</span><div className="metric-value">87</div></div><div className="metric-card"><span className="metric-label">Error rate</span><div className="metric-value">0.2%</div></div><div className="metric-card"><span className="metric-label">API p95</span><div className="metric-value">84<small> ms</small></div></div><div className="metric-card"><span className="metric-label">GPS p95</span><div className="metric-value">310<small> ms</small></div></div></div>
  </section>;
}

function VisualForms(){
  return <main id="main-content" className="page visual-qa-page"><section className="module-section"><header className="module-header"><div><span className="eyebrow">UI QA</span><h1 className="module-title">Flujos y estados</h1><p className="module-copy">Controles representativos para contraste, foco y targets táctiles.</p></div></header><div className="grid grid-2"><section className="route-settings-card"><div className="route-section-head"><div><strong>Configuración de ruta</strong><small>Campos y selección</small></div></div><label>Nombre<input className="input" defaultValue="Centro → Terminal"/></label><label>Estado<select className="input" defaultValue="active"><option value="active">Activa</option></select></label><button className="btn" data-critical-action>Guardar ruta</button></section><section className="document-card"><div className="document-icon">DOC</div><div className="document-card-main"><div className="document-card-head"><div><strong>Licencia</strong><small>Luis Olvera</small></div><span className="state-badge maintenance">pending</span></div><div className="document-meta"><span>Vigencia <strong>15/10/2026</strong></span><span className="document-expiry">vence en 16 días</span></div></div><div className="document-actions"><button>Aprobar</button><button className="danger">Rechazar</button></div></section></div></section></main>;
}


function VisualMarketing(){
  return <div className="shell marketing-home marketing-v3">
    <Navigation/>
    <main id="main-content">
      <MarketingHero/>
      <MarketingProductStory/>
      <MarketingBento/>
      <MarketingProcess/>
      <section id="planes" className="marketing-v3-section marketing-plans-section">
        <Reveal><div className="marketing-v3-section-head compact"><span className="marketing-kicker">PLANES</span><h2>Elige el tamaño de tu flota.</h2><p>Empieza con la capacidad que necesitas y conserva el mismo sistema al crecer.</p></div></Reveal>
        <Reveal delay={70}><PlanCards/></Reveal>
      </section>
      <MarketingFaq/>
      <MarketingFinalCta/>
    </main>
    <MarketingFooter/>
  </div>;
}


function VisualOperationAuth(){
  return <OperationAuthLayout active="login" showRecovery>
    <AuthForm mode="login" operation/>
  </OperationAuthLayout>;
}
