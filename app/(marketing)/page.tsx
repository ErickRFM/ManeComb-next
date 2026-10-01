import Link from "next/link";
import { Navigation } from "@/src/components/navigation";
import {PlanCards} from "@/src/components/plan-cards";
import {Icon,type IconName} from "@/src/components/ui/icon";
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
  return <div className="shell marketing-home"><Navigation/><main id="main-content">
    <section className="hero"><span className="badge">MANECOMB</span><h1>Tu línea, conectada en cada recorrido.</h1><p>Un portal para coordinar tu flota y una aplicación de operación para tus conductores. Mapa, rutas y comunicación en una sola plataforma.</p><div className="marketing-actions"><Link className="btn" href="/registro">Comenzar</Link><Link className="btn secondary" href="/planes">Ver planes</Link></div></section>
    <section id="producto" className="page grid"><h2>El producto en tu operación</h2><div className="grid grid-2"><article className="card"><Icon name="map"/><h3>Portal empresarial</h3><p className="muted">Abre en el mapa de la flota. Consulta cada unidad y coordina rutas, personas, documentos y comunicación según tu rol.</p><Link className="btn secondary" href="/portal/monitoreo">Entrar al portal</Link></article><article className="card"><Icon name="vehicle"/><h3>Aplicación de operación</h3><p className="muted">El conductor consulta su jornada, ruta y ubicación, habla con la central y reporta alertas desde su sesión operativa.</p><Link className="btn secondary" href="/app">Entrar a operación</Link></article></div></section>
    <section className="page grid"><h2>Información para decidir</h2><div className="grid grid-3"><article className="card"><h3>Ubicación con contexto</h3><p className="muted">Identifica la unidad, su ruta y cuándo reportó por última vez.</p></article><article className="card"><h3>Comunicación de la línea</h3><p className="muted">Chat para mensajes y Radio para hablar por turnos, en módulos separados.</p></article><article className="card"><h3>Seguimiento operativo</h3><p className="muted">Revisa jornadas, incidencias y documentos de tu empresa.</p></article></div></section>
    <section className="page grid"><h2>Cómo funciona</h2><ol className="grid grid-3 marketing-steps"><li className="card"><h3>Registra tu empresa</h3><p className="muted">Elige un plan y crea la cuenta del responsable.</p></li><li className="card"><h3>Prepara tu flota</h3><p className="muted">Registra unidades, rutas y conductores desde el portal.</p></li><li className="card"><h3>Coordina la jornada</h3><p className="muted">Asigna la operación y sigue su avance en el mapa.</p></li></ol></section>
    <section id="modulos" className="page grid"><h2>Módulos para la operación diaria</h2><div className="grid grid-4">{modules.map(module=><article className="card" key={module.name}><Icon name={module.icon}/><h3>{module.name}</h3><p className="muted">{module.copy}</p></article>)}</div></section>
    <section className="page grid"><h2>Elige el tamaño de tu flota</h2><PlanCards/></section>
    <section className="page grid marketing-faq"><h2>Preguntas frecuentes</h2><details className="card"><summary>¿Qué usa la central y qué usa el conductor?</summary><p>La central usa el Portal empresarial. El conductor entra a Operación con su cuenta activada y unidad asignada.</p></details><details className="card"><summary>¿Puedo cambiar de plan?</summary><p>El responsable con permiso de facturación puede consultar las opciones desde su suscripción. La capacidad y el estado vigente determinan qué cambios están disponibles.</p></details><details className="card"><summary>¿Chat y Radio son diferentes?</summary><p>Sí. Chat conserva mensajes y adjuntos. Radio permite hablar por turnos; también existe un módulo de llamadas de audio.</p></details><details className="card"><summary>¿Cómo activo a un conductor?</summary><p>El responsable crea al conductor y comparte su clave de activación. El conductor activa su cuenta antes de entrar a Operación.</p></details></section>
    <section className="page grid"><h2>Conecta la operación de tu línea</h2><div className="marketing-actions"><Link className="btn" href="/registro">Registrar empresa</Link><Link className="btn secondary" href="/contacto">Contactar a ManeComb</Link></div></section>
  </main><footer className="page marketing-footer"><strong>ManeComb</strong><Link href="/planes">Planes</Link><Link href="/contacto">Contacto</Link><Link href="/legal">Legal</Link><Link href="/login">Entrar</Link></footer></div>;
}
