import Link from "next/link";
export function Navigation() {
  return <nav className="nav">
    <Link href="/" style={{fontWeight:900,letterSpacing:"-.03em"}}>Mane<span className="brand">Comb</span></Link>
    <div className="nav-links"><Link href="/planes">Planes</Link><Link href="/portal/dashboard">Portal</Link><Link href="/admin/salud">Admin</Link><Link href="/operacion">Operación</Link><Link href="/contacto">Contacto</Link></div>
    <Link className="btn secondary" href="/login">Entrar</Link>
  </nav>;
}
