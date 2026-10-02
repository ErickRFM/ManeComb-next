import Link from "next/link";
import { AuthForm } from "@/src/components/auth-form";
import { Navigation } from "@/src/components/navigation";
import { BrandLogo } from "@/src/components/brand-logo";
import { MarketingProductPreview } from "@/src/components/marketing-product-preview";
import { getCommercialPlan } from "@/src/core/domain/commercial-plans";

export default async function RegisterPage({searchParams}:{searchParams:Promise<{plan?:string}>}){
  const {plan}=await searchParams;
  const selected=plan?getCommercialPlan(plan):null;

  return <div className="shell auth-premium-shell">
    <Navigation/>
    <main id="main-content" className="auth-premium auth-register-premium">
      <section className="auth-brand-panel" aria-label="Alta ManeComb">
        <BrandLogo size="lg"/>
        <div className="auth-brand-copy">
          <span className="eyebrow">ALTA DE EMPRESA</span>
          <h1>Tu flota empieza con una base ordenada.</h1>
          <p>Crea la organización propietaria y entra al portal para preparar unidades, conductores, rutas y seguimiento desde un solo lugar.</p>
        </div>
        <div className="auth-register-value">
          <div><strong>01</strong><span>Empresa y responsable</span><small>Una cuenta propietaria para administrar el alta inicial.</small></div>
          <div><strong>02</strong><span>Flota y operación</span><small>Después del registro podrás preparar unidades, rutas y conductores.</small></div>
          <div><strong>03</strong><span>Mapa como centro</span><small>El portal conserva la operación alrededor del seguimiento de tu flota.</small></div>
        </div>
        <MarketingProductPreview compact/>
      </section>

      <section className="auth-form-panel">
        <div className="auth-form-card auth-register-card">
          <span className="eyebrow">CREAR CUENTA</span>
          <h2>Registra tu línea</h2>
          <p>Completa los datos de la empresa y del responsable principal.</p>
          {selected?
            <div className="auth-selected-plan" aria-label="Plan seleccionado">
              <div><small>Plan seleccionado</small><strong>{selected.label}</strong></div>
              <span>${selected.monthlyMxn} MXN / mes</span>
            </div>
          :null}
          <AuthForm mode="register" planCode={selected?.code}/>
          <div className="auth-form-links">
            <p className="muted">¿Ya tienes cuenta? <Link className="brand" href="/login">Inicia sesión</Link></p>
            <Link href="/planes">Revisar planes antes de continuar</Link>
          </div>
        </div>
      </section>
    </main>
  </div>;
}
