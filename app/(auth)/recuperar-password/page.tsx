import { ModuleShell } from "@/src/components/module-shell";
import { PasswordRecovery } from "@/src/components/password-recovery";
import Link from "next/link";
export default async function RecoverPage({searchParams}:{searchParams:Promise<{surface?:string}>}){const operation=(await searchParams).surface==="operation";
  return <ModuleShell operation={operation} eyebrow="SEGURIDAD" title="Recuperar acceso" description="Solicita un enlace para restablecer tu contraseña."><PasswordRecovery/><Link href={operation?"/login?surface=operation":"/login"}>Volver al acceso</Link></ModuleShell>
}
