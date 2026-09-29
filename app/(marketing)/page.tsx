import Link from "next/link";
import { Navigation } from "@/src/components/navigation";
export default function HomePage(){
  return <div className="shell"><Navigation/><main>
    <section className="hero"><span className="badge">MOVILIDAD EN TIEMPO REAL</span><h1>Control operativo para cada combi.</h1><p>Monitorea flota, rutas, jornadas, incidencias, documentos y comunicación desde una sola plataforma.</p><div style={{display:"flex",gap:12,justifyContent:"center",flexWrap:"wrap"}}><Link className="btn" href="/registro">Comenzar</Link><Link className="btn secondary" href="/planes">Ver planes</Link></div></section>
    <section className="page grid grid-3"><div className="card"><h3>GPS en vivo</h3><p className="muted">Frescura canónica y telemetría continua por unidad.</p></div><div className="card"><h3>Radio y chat</h3><p className="muted">PTT, WebRTC y mensajería operativa en tiempo real.</p></div><div className="card"><h3>Operación segura</h3><p className="muted">Jornadas, incidencias, documentos y auditoría multitenant.</p></div></section>
  </main></div>;
}
