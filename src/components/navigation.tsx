import Link from "next/link";
import { BrandLogo } from "@/src/components/brand-logo";

export function Navigation() {
  return <nav className="nav" aria-label="Navegación principal">
    <div className="nav-inner">
      <Link href="/" className="nav-brand" aria-label="ManeComb inicio"><BrandLogo size="md"/></Link>
      <div className="nav-links"><Link href="/#producto">Producto</Link><Link href="/#modulos">Módulos</Link><Link href="/planes">Planes</Link><Link href="/contacto">Contacto</Link></div>
      <Link className="btn secondary nav-cta" href="/login">Entrar</Link>
    </div>
  </nav>;
}
