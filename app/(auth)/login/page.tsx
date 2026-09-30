import Link from "next/link";
import { ModuleShell } from "@/src/components/module-shell";
import { AuthForm } from "@/src/components/auth-form";
export default async function LoginPage({searchParams}:{searchParams:Promise<{surface?:string}>}){
  const operation=(await searchParams).surface==="operation";
  return <ModuleShell eyebrow="MANECOMB" title="Entrar a ManeComb" description="Accede con tu cuenta para continuar."><AuthForm mode="login"/>{!operation?<p className="muted">¿No tienes cuenta? <Link className="brand" href="/registro">Registra tu empresa</Link></p>:null}</ModuleShell>;
}
