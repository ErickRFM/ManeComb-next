import Link from "next/link";
import { BrandLogo } from "@/src/components/brand-logo";

export function MarketingFooter(){
  return <footer className="marketing-v3-footer">
    <div className="marketing-v3-footer-brand"><BrandLogo size="md"/><p>Operación de flota y comunicación en tiempo real.</p></div>
    <div className="marketing-v3-footer-groups">
      <div><strong>Producto</strong><Link href="/#producto">Plataforma</Link><Link href="/planes">Planes</Link></div>
      <div><strong>Empresa</strong><Link href="/contacto">Contacto</Link><Link href="/legal">Legal</Link></div>
      <div><strong>Cuenta</strong><Link href="/login">Entrar</Link><Link href="/registro">Registrar empresa</Link></div>
    </div>
  </footer>;
}
