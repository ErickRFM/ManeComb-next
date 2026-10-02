import Link from "next/link";
import { MarketingProductStage } from "@/src/components/marketing/marketing-product-stage";

export function MarketingHero(){
  return <section className="marketing-v3-hero">
    <div className="marketing-v3-hero-copy marketing-hero-sequence">
      <span className="marketing-kicker">OPERACIÓN DE FLOTA EN TIEMPO REAL</span>
      <h1><span>Tu flotilla,</span><span>bajo control.</span></h1>
      <p>Ubicación, rutas, conductores y comunicación en tiempo real, desde una sola plataforma operativa.</p>
      <div className="marketing-v3-actions">
        <Link className="btn marketing-primary-cta" data-critical-action href="/registro">Comenzar</Link>
        <Link className="marketing-text-link" href="/#producto">Explorar plataforma <span aria-hidden="true">→</span></Link>
      </div>
      <div className="marketing-v3-trust" aria-label="Capacidades principales">
        <span><i/>Seguimiento en tiempo real</span>
        <span><i/>Operación por roles</span>
        <span><i/>Comunicación integrada</span>
      </div>
    </div>
    <div className="marketing-stage-enter"><MarketingProductStage/></div>
  </section>;
}
