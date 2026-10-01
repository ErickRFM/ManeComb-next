import Link from "next/link";
import { Navigation } from "@/src/components/navigation";
import { PlanCards } from "@/src/components/plan-cards";
import { Icon, type IconName } from "@/src/components/ui/icon";
import { Reveal } from "@/src/components/ui/reveal";
import { MarketingProductPreview } from "@/src/components/marketing-product-preview";
import { BrandLogo } from "@/src/components/brand-logo";

const modules:Array<{name:string;icon:IconName;copy:string}>=[
  {name:"GPS",icon:"location",copy:"Ubicación y antigüedad de cada transmisión."},
  {name:"Rutas",icon:"route",copy:"Geometría, paradas y navegación durante la jornada."},
  {name:"Conductores",icon:"users",copy:"Activación, asignación de unidades y jornadas."},
  {name:"Chat",icon:"chat",copy:"Canal general, mensajes directos e imágenes."},
  {name:"Radio",icon:"radio",copy:"Comunicación por turnos y llamadas de audio."},
  {name:"Documentos",icon:"document",copy:"Carga, revisión, descarga y vigencia."},
  {name:"Incidencias",icon:"alert",copy:"Reportes y seguimiento con acceso por rol."},
  {name:"Facturación",icon:"billing",copy:"Plan, suscripción e historial de pagos."}
];

export default function HomePage(){
  return <div className="shell marketing-home">
    <Navigation/>
    <main id="main-content">
      <section className="marketing-hero">
        <div className="marketing-hero-copy hero-sequence">
          <span className="badge">MANECOMB</span>
          <h1>Tu línea, conectada en cada recorrido.</h1>
          <p>Coordina tu flota desde un portal operativo y mantén a tus conductores conectados con mapa, rutas, chat y radio en una sola experiencia.</p>
          <div className="marketing-actions"><Link className="btn" href="/registro">Comenzar</Link><Link className="btn secondary" href="/planes">Ver planes</Link></div>
          <div className="marketing-trust"><span>Mapa en tiempo real</span><span>Operación por roles</span><span>Comunicación integrada</span></div>
        </div>
        <div className="hero-preview-enter"><MarketingProductPreview/></div>
      </section>

      <Reveal>
        <section id="producto" className="marketing-section marketing-split">
          <div className="marketing-split-copy">
            <span className="eyebrow">OPERACIÓN CENTRALIZADA</span>
            <h2>Lo importante aparece donde lo necesitas.</h2>
            <p>El Portal abre directamente en el mapa. Desde ahí puedes revisar unidades, rutas, conductores, documentos e incidencias sin perder el contexto operativo.</p>
            <div className="marketing-feature-list">
              <div className="marketing-feature"><span><Icon name="map"/></span><div><strong>Mapa como punto de partida</strong><small>Unidad, estado, ruta y última transmisión en una sola vista.</small></div></div>
              <div className="marketing-feature"><span><Icon name="chat"/></span><div><strong>Chat separado de Radio</strong><small>Mensajes persistentes para coordinación y PTT para comunicación rápida.</small></div></div>
              <div className="marketing-feature"><span><Icon name="document"/></span><div><strong>Gestión con contexto</strong><small>Conductores, documentos, incidencias y facturación dentro del mismo ecosistema.</small></div></div>
            </div>
          </div>
          <MarketingProductPreview compact/>
        </section>
      </Reveal>

      <Reveal delay={60}>
        <section className="marketing-section compact">
          <h2>Cómo funciona</h2>
          <p className="marketing-section-lead">Configura tu empresa, prepara la flota y coordina cada jornada desde el mismo flujo.</p>
          <ol className="marketing-steps">
            <li><h3>Registra tu empresa</h3><p>Elige un plan y crea la cuenta del responsable.</p></li>
            <li><h3>Prepara tu flota</h3><p>Registra unidades, rutas y conductores desde el portal.</p></li>
            <li><h3>Coordina la jornada</h3><p>Asigna la operación y sigue su avance desde el mapa.</p></li>
          </ol>
        </section>
      </Reveal>

      <section id="modulos" className="marketing-section">
        <Reveal><h2>Módulos para la operación diaria</h2><p className="marketing-section-lead">Cada módulo conserva su función y comparte la misma identidad, permisos y navegación ManeComb.</p></Reveal>
        <div className="marketing-card-grid">
          {modules.map((module,index)=><Reveal key={module.name} delay={(index%4)*60}><article className="marketing-card"><Icon name={module.icon}/><h3>{module.name}</h3><p>{module.copy}</p></article></Reveal>)}
        </div>
      </section>

      <Reveal>
        <section className="marketing-section compact">
          <h2>Elige el tamaño de tu flota</h2>
          <p className="marketing-section-lead">Comienza con la capacidad que necesitas y administra tu suscripción desde ManeComb.</p>
          <PlanCards/>
        </section>
      </Reveal>

      <Reveal>
        <section className="marketing-section marketing-faq">
          <div><span className="eyebrow">PREGUNTAS FRECUENTES</span><h2>Antes de comenzar.</h2><p className="marketing-section-lead">Lo esencial sobre Portal, Operación y comunicación.</p></div>
          <div className="marketing-faq-list">
            <details><summary>¿Qué usa la central y qué usa el conductor?</summary><p>La central usa el Portal empresarial. El conductor entra a Operación con su cuenta activada y unidad asignada.</p></details>
            <details><summary>¿Puedo cambiar de plan?</summary><p>El responsable con permiso de facturación puede consultar las opciones desde su suscripción. La capacidad y el estado vigente determinan qué cambios están disponibles.</p></details>
            <details><summary>¿Chat y Radio son diferentes?</summary><p>Sí. Chat conserva mensajes y adjuntos. Radio permite hablar por turnos y el módulo RTC cubre llamadas de audio.</p></details>
            <details><summary>¿Cómo activo a un conductor?</summary><p>El responsable crea al conductor y comparte su clave de activación. El conductor activa su cuenta antes de entrar a Operación.</p></details>
          </div>
        </section>
      </Reveal>

      <Reveal>
        <section className="marketing-section compact">
          <div className="marketing-cta">
            <div><h2>Conecta la operación de tu línea.</h2><p>Empieza con tu empresa y lleva el seguimiento diario a un solo sistema.</p></div>
            <div className="marketing-actions"><Link className="btn" href="/registro">Registrar empresa</Link><Link className="btn secondary" href="/contacto">Contactar</Link></div>
          </div>
        </section>
      </Reveal>
    </main>
    <footer className="marketing-footer">
      <div className="marketing-footer-brand"><BrandLogo size="md"/><small>Operación de flota y comunicación en tiempo real.</small></div>
      <div className="marketing-footer-links"><Link href="/planes">Planes</Link><Link href="/contacto">Contacto</Link><Link href="/legal">Legal</Link><Link href="/login">Entrar</Link></div>
    </footer>
  </div>;
}
