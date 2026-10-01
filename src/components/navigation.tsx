import Link from "next/link";
export function Navigation() {
  return <nav className="nav">
    <Link href="/" style={{fontWeight:900,letterSpacing:"-.03em"}}>Mane<span className="brand">Comb</span></Link>
    <div className="nav-links"><Link href="/#producto">Producto</Link><Link href="/#modulos">Módulos</Link><Link href="/planes">Planes</Link><Link href="/contacto">Contacto</Link></div>
    <Link className="btn secondary" href="/login">Entrar</Link>
  </nav>;
}
