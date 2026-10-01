import Link from "next/link";
import { ModuleShell } from "@/src/components/module-shell";
import { AuthForm } from "@/src/components/auth-form";
import { Navigation } from "@/src/components/navigation";
import { BrandLogo } from "@/src/components/brand-logo";
import { MarketingProductPreview } from "@/src/components/marketing-product-preview";
import { getCommercialPlan } from "@/src/core/domain/commercial-plans";

export default async function LoginPage({searchParams}:{searchParams:Promise<{surface?:string;plan?:string}>}){
  const params=await searchParams;
  const operation=params.surface==="operation";
  const selected=!operation&&params.plan?getCommercialPlan(params.plan):null;

  if(operation){
    return <ModuleShell operation title="Entrar a ManeComb" description="Accede con tu cuenta para continuar.">
      <AuthForm mode="login" operation planCode={selected?.code}/>
      <Link href="/recuperar-password?surface=operation">Recuperar contraseña</Link>
      <p><Link href="/activar?surface=operation">Activar cuenta de conductor</Link></p>
    </ModuleShell>;
  }

  return <div className="shell auth-premium-shell">
    <Navigation/>
    <main id="main-content" className="auth-premium">
      <section className="auth-brand-panel" aria-label="ManeComb">
        <BrandLogo size="lg"/>
        <div className="auth-brand-copy"><h1>Control operativo para cada recorrido.</h1><p>Entra al Portal para ver tu flota, coordinar rutas y mantener la comunicación con tus conductores.</p></div>
        <MarketingProductPreview compact/>
      </section>
      <section className="auth-form-panel">
        <div className="auth-form-card">
          <h2>Entrar a ManeComb</h2>
          <p>Accede con tu cuenta para continuar.</p>
          {selected?<p className="muted">Plan seleccionado: {selected.label}</p>:null}
          <AuthForm mode="login" planCode={selected?.code}/>
          <div className="auth-form-links">
            <Link href="/recuperar-password">Recuperar contraseña</Link>
            <p className="muted">¿No tienes cuenta? <Link className="brand" href={selected?"/registro?plan="+selected.code:"/registro"}>Registra tu empresa</Link></p>
          </div>
        </div>
      </section>
    </main>
  </div>;
}
