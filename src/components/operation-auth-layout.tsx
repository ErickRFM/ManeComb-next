import Link from "next/link";
import { BrandLogo } from "@/src/components/brand-logo";

export function OperationAuthLayout({
  active,
  children,
  showRecovery=false
}:{
  active:"login"|"activate"|"recovery";
  children:React.ReactNode;
  showRecovery?:boolean;
}){
  return <main id="main-content" className="operation-auth-shell">
    <section className="operation-auth-panel" aria-label="Acceso a ManeComb Operación">
      <header className="operation-auth-brand">
        <BrandLogo size="lg" tone="dark" className="operation-auth-logo"/>
      </header>

      <div className="operation-auth-artwork" aria-hidden="true">
        <img src="/manecomb-mobile-faster.png" alt="" />
        <p>Siguiendo lo importante.</p>
      </div>

      {active!=="recovery"?<nav className="operation-auth-segment" aria-label="Acceso de conductor">
        <Link className={active==="login"?"active":""} aria-current={active==="login"?"page":undefined} href="/login?surface=operation">Iniciar sesión</Link>
        <Link className={active==="activate"?"active":""} aria-current={active==="activate"?"page":undefined} href="/activar?surface=operation">Activar cuenta</Link>
      </nav>:null}

      <div className="operation-auth-content">
        {active==="login"?<div className="operation-activation-copy"><h1>Iniciar sesión</h1><p>Accede a tu operación con tu cuenta.</p></div>:null}
        {children}
        {showRecovery?<div className="operation-auth-links">
          <Link href="/recuperar-password?surface=operation">¿Olvidaste tu contraseña?</Link>
        </div>:null}
      </div>

      <footer className="operation-auth-legal">
        <span>Al continuar, aceptas los términos operativos y el aviso de privacidad de ManeComb.</span>
      </footer>
    </section>
  </main>;
}
