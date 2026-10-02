import { Navigation } from "@/src/components/navigation";
import { ContactForm } from "@/src/components/contact-form";
import { MarketingFooter } from "@/src/components/marketing/marketing-footer";

export default function ContactPage(){
  return <div className="shell marketing-home marketing-v3">
    <Navigation/>
    <main id="main-content" className="marketing-subpage marketing-contact-page">
      <header className="marketing-subpage-hero">
        <span className="marketing-kicker">CONTACTO</span>
        <h1>Hablemos de tu operación.</h1>
        <p>Cuéntanos cuántas unidades administras, cómo coordinas hoy a tus conductores y qué parte de la operación quieres mejorar.</p>
      </header>
      <section className="marketing-contact-grid">
        <div className="marketing-contact-context">
          <div><span>01</span><strong>Entendemos tu flujo</strong><p>Ruta, tamaño de flota y forma actual de coordinación.</p></div>
          <div><span>02</span><strong>Ubicamos el punto de entrada</strong><p>Plan, módulos y configuración inicial sin inventar procesos paralelos.</p></div>
          <div><span>03</span><strong>Preparas la operación</strong><p>Empresa, unidades, conductores y seguimiento desde un mismo sistema.</p></div>
        </div>
        <div className="marketing-contact-form"><ContactForm/></div>
      </section>
    </main>
    <MarketingFooter/>
  </div>;
}
