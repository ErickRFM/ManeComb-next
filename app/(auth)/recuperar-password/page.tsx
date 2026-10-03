import { ModuleShell } from "@/src/components/module-shell";
import { PasswordRecovery } from "@/src/components/password-recovery";
import { OperationAuthLayout } from "@/src/components/operation-auth-layout";
import Link from "next/link";

export default async function RecoverPage({searchParams}:{searchParams:Promise<{surface?:string}>}){
  const operation=(await searchParams).surface==="operation";
  if(operation){
    return <OperationAuthLayout active="recovery">
      <div className="operation-activation-copy">
        <h1>Recuperar acceso</h1>
        <p>Solicita un enlace para restablecer tu contraseña.</p>
      </div>
      <PasswordRecovery/>
      <Link className="operation-auth-back" href="/login?surface=operation">Volver al acceso</Link>
    </OperationAuthLayout>;
  }
  return <ModuleShell eyebrow="SEGURIDAD" title="Recuperar acceso" description="Solicita un enlace para restablecer tu contraseña."><PasswordRecovery/><Link href="/login">Volver al acceso</Link></ModuleShell>;
}
