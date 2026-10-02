import { Reveal } from "@/src/components/ui/reveal";

export function MarketingFaq(){
  return <section className="marketing-v3-section marketing-v3-faq">
    <Reveal><div className="marketing-v3-faq-intro"><span className="marketing-kicker">PREGUNTAS FRECUENTES</span><h2>Antes de comenzar.</h2><p>Lo esencial sobre Portal, Operación y comunicación.</p></div></Reveal>
    <Reveal delay={70}><div className="marketing-v3-faq-list">
      <details><summary><span>¿Qué usa la central y qué usa el conductor?</span><i aria-hidden="true"/></summary><div className="marketing-faq-answer"><p>La central usa el Portal empresarial. El conductor entra a Operación con su cuenta activada y unidad asignada.</p></div></details>
      <details><summary><span>¿Puedo cambiar de plan?</span><i aria-hidden="true"/></summary><div className="marketing-faq-answer"><p>El responsable con permiso de facturación puede consultar las opciones desde su suscripción. La capacidad y el estado vigente determinan qué cambios están disponibles.</p></div></details>
      <details><summary><span>¿Chat y Radio son diferentes?</span><i aria-hidden="true"/></summary><div className="marketing-faq-answer"><p>Sí. Chat conserva mensajes y adjuntos. Radio está pensado para comunicación rápida por turnos y RTC cubre llamadas de audio.</p></div></details>
      <details><summary><span>¿Cómo activo a un conductor?</span><i aria-hidden="true"/></summary><div className="marketing-faq-answer"><p>El responsable crea al conductor y comparte su clave de activación. El conductor activa su cuenta antes de entrar a Operación.</p></div></details>
    </div></Reveal>
  </section>;
}
