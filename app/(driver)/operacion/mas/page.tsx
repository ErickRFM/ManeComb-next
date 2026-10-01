import Link from "next/link";
import {SignOutButton} from "@/src/components/sign-out-button";
export default function MorePage(){return <section className="grid"><h1>Más</h1>
  <Link className="card" href="/operacion/navegacion">Ruta, paradas y avance</Link>
  <Link className="card" href="/operacion#controles-jornada">Controles de jornada y GPS</Link>
  <Link className="card" href="/operacion/sos">Reportar emergencia SOS</Link>
  <SignOutButton operation/>
</section>}
