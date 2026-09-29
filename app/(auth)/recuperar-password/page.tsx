import { ModuleShell } from "@/src/components/module-shell";
import { PasswordRecovery } from "@/src/components/password-recovery";
export default function RecoverPage(){
  return <ModuleShell eyebrow="SEGURIDAD" title="Recuperar acceso" description="El enlace se genera en servidor, se envía por el outbox transaccional y vence en 30 minutos."><PasswordRecovery/></ModuleShell>
}
