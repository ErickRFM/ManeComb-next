import Link from "next/link";
import { ModuleShell } from "@/src/components/module-shell";
import { AuthForm } from "@/src/components/auth-form";
import {getCommercialPlan} from "@/src/core/domain/commercial-plans";
export default async function LoginPage({searchParams}:{searchParams:Promise<{surface?:string;plan?:string}>}){
  const params=await searchParams;const operation=params.surface==="operation";const selected=!operation&&params.plan?getCommercialPlan(params.plan):null;
  return <ModuleShell operation={operation} eyebrow="MANECOMB" title="Entrar a ManeComb" description="Accede con tu cuenta para continuar."><AuthForm mode="login" operation={operation} planCode={selected?.code}/><Link href={operation?"/recuperar-password?surface=operation":"/recuperar-password"}>Recuperar contraseña</Link>{operation?<p><Link href="/activar?surface=operation">Activar cuenta de conductor</Link></p>:<p className="muted">¿No tienes cuenta? <Link className="brand" href={selected?"/registro?plan="+selected.code:"/registro"}>Registra tu empresa</Link></p>}</ModuleShell>;
}
