import Link from "next/link";
import { Navigation } from "@/src/components/navigation";
import { PlanCards } from "@/src/components/plan-cards";
import { MarketingFooter } from "@/src/components/marketing/marketing-footer";

export default function PlansPage(){
  return <div className="shell marketing-home marketing-v3">
    <Navigation/>
    <main id="main-content" className="marketing-subpage">
      <header className="marketing-subpage-hero">
        <span className="marketing-kicker">PLANES MANECOMB</span>
        <h1>Crece sin cambiar de sistema.</h1>
        <p>Suscripción mensual en MXN según el tamaño de tu flota. Elige la capacidad que necesitas hoy y conserva la misma operación al crecer.</p>
      </header>
      <section className="marketing-subpage-body marketing-plans-section" aria-label="Planes disponibles">
        <PlanCards/>
      </section>
      <section className="marketing-subpage-note">
        <div><strong>¿No sabes qué capacidad elegir?</strong><p>Cuéntanos cómo opera tu línea y te ayudamos a ubicar el punto de entrada correcto.</p></div>
        <Link className="marketing-text-link" href="/contacto">Hablar con ManeComb <span aria-hidden="true">→</span></Link>
      </section>
    </main>
    <MarketingFooter/>
  </div>;
}
