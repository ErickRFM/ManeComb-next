import { Icon } from "@/src/components/ui/icon";
import { Reveal } from "@/src/components/ui/reveal";

export function MarketingBento(){
  return <section id="modulos" className="marketing-v3-section marketing-bento-section">
    <Reveal>
      <div className="marketing-v3-section-head">
        <span className="marketing-kicker">UNA SOLA OPERACIÓN</span>
        <h2>Diseñado para operar, no sólo para observar.</h2>
        <p>Seguimiento, coordinación y comunicación comparten el mismo contexto para que la central pueda decidir rápido y el conductor siga trabajando.</p>
      </div>
    </Reveal>

    <div className="marketing-bento">
      <Reveal className="marketing-bento-item marketing-bento-map" delay={40}>
        <article>
          <div className="marketing-bento-head"><span className="marketing-bento-icon"><Icon name="map"/></span><span className="marketing-bento-tag">MAPA EN VIVO</span></div>
          <h3>La operación empieza en el mapa.</h3>
          <p>Unidades, ruta, conductor y frescura GPS sin cambiar de contexto.</p>
          <div className="marketing-bento-mini-map" aria-hidden="true"><span className="mini-road a"/><span className="mini-road b"/><span className="mini-route"/><span className="mini-unit one">C-5</span><span className="mini-unit two">C-3</span><span className="mini-unit three">C-8</span></div>
        </article>
      </Reveal>

      <Reveal className="marketing-bento-item marketing-bento-chat" delay={90}>
        <article>
          <div className="marketing-bento-head"><span className="marketing-bento-icon"><Icon name="chat"/></span><span className="marketing-bento-tag">CHAT</span></div>
          <h3>Coordina sin perder historial.</h3>
          <div className="marketing-chat-preview" aria-hidden="true"><span className="incoming">C-5 ya salió de terminal.</span><span className="outgoing">Recibido. Mantén Ruta Centro.</span></div>
        </article>
      </Reveal>

      <Reveal className="marketing-bento-item marketing-bento-radio" delay={140}>
        <article>
          <div className="marketing-bento-head"><span className="marketing-bento-icon"><Icon name="radio"/></span><span className="marketing-bento-tag">RADIO</span></div>
          <h3>PTT para lo inmediato.</h3>
          <div className="marketing-radio-preview" aria-hidden="true"><span className="marketing-radio-wave"/><span className="marketing-radio-wave"/><span className="marketing-radio-wave"/><b>Canal operativo</b></div>
        </article>
      </Reveal>

      <Reveal className="marketing-bento-item marketing-bento-route" delay={80}>
        <article>
          <div className="marketing-bento-head"><span className="marketing-bento-icon"><Icon name="route"/></span><span className="marketing-bento-tag">RUTAS</span></div>
          <h3>Asigna y sigue recorridos.</h3>
          <p>Rutas activas, avance y contexto de jornada en una sola vista.</p>
        </article>
      </Reveal>

      <Reveal className="marketing-bento-item marketing-bento-journey" delay={120}>
        <article>
          <div className="marketing-bento-head"><span className="marketing-bento-icon"><Icon name="vehicle"/></span><span className="marketing-bento-tag">JORNADAS</span></div>
          <h3>Del checklist al cierre.</h3>
          <div className="marketing-journey-track" aria-hidden="true"><span className="done">Checklist</span><i/><span className="active">En ruta</span><i/><span>Cierre</span></div>
        </article>
      </Reveal>

      <Reveal className="marketing-bento-item marketing-bento-docs" delay={100}>
        <article>
          <div className="marketing-bento-head"><span className="marketing-bento-icon"><Icon name="document"/></span><span className="marketing-bento-tag">CONTROL</span></div>
          <h3>Documentos e incidencias con contexto.</h3>
          <p>Vigencias, revisiones y reportes operativos ligados a la flota.</p>
        </article>
      </Reveal>
    </div>
  </section>;
}
