import Link from "next/link";
import { Reveal } from "@/src/components/ui/reveal";

export function MarketingFinalCta(){
  return <Reveal><section className="marketing-v3-final">
    <span className="marketing-kicker">MANECOMB</span>
    <h2>Tu operación<br/>empieza aquí.</h2>
    <p>Toda tu flotilla en un solo sistema, desde el primer recorrido.</p>
    <div className="marketing-v3-actions centered"><Link className="btn marketing-primary-cta" data-critical-action href="/registro">Comenzar con ManeComb</Link><Link className="marketing-text-link" href="/planes">Ver planes <span aria-hidden="true">→</span></Link></div>
  </section></Reveal>;
}
