import { Icon } from "@/src/components/ui/icon";
import { Reveal } from "@/src/components/ui/reveal";

export function MarketingProductStory(){
  return <section id="producto" className="marketing-v3-section marketing-product-story">
    <Reveal><div className="marketing-product-story-copy">
      <span className="marketing-kicker">OPERACIÓN CENTRALIZADA</span>
      <h2>Lo importante aparece donde lo necesitas.</h2>
      <p>El Portal abre en el mapa y mantiene el contexto mientras cambias entre unidades, rutas y comunicación. Menos saltos entre herramientas; más claridad para operar.</p>
    </div></Reveal>
    <div className="marketing-product-principles">
      <Reveal delay={40}><div><span><Icon name="map" size={18}/></span><strong>Mapa como punto de partida</strong><p>Estado, ruta y última transmisión en la misma superficie.</p></div></Reveal>
      <Reveal delay={100}><div><span><Icon name="chat" size={18}/></span><strong>Comunicación con contexto</strong><p>Chat y Radio separados por función, conectados a la misma operación.</p></div></Reveal>
      <Reveal delay={160}><div><span><Icon name="document" size={18}/></span><strong>Gestión sin perder el recorrido</strong><p>Documentos e incidencias siguen ligados a unidades y conductores.</p></div></Reveal>
    </div>
  </section>;
}
