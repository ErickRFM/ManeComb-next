import Link from "next/link";
import {SignOutButton} from "@/src/components/sign-out-button";
export default function MorePage(){return <section className="grid mobile-v3-more"><h1>Más</h1>
  <section className="mobile-v3-more-group" aria-labelledby="more-operation"><h2 id="more-operation">Operación</h2><div className="grid">
  <Link className="card" href="/operacion/navegacion">Ruta, paradas y avance</Link>
  <Link className="card" href="/operacion#controles-jornada">Controles de jornada y GPS</Link>
  </div></section>
  <section className="mobile-v3-more-group" aria-labelledby="more-emergency"><h2 id="more-emergency">Emergencia</h2><div className="grid">
  <Link className="card" href="/operacion/sos">Reportar emergencia SOS</Link>
  </div></section>
  <section className="mobile-v3-more-group" aria-labelledby="more-session"><h2 id="more-session">Sesión</h2><div className="grid">
  <SignOutButton operation/>
  </div></section>
</section>}
