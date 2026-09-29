import { ModuleShell } from "@/src/components/module-shell";
import { MfaForm } from "@/src/components/mfa-form";

export default function MfaPage() {
  return <ModuleShell eyebrow="MFA" title="Verificación de administrador" description="Las cuentas de plataforma requieren un segundo factor TOTP antes de crear una sesión administrativa."><MfaForm /></ModuleShell>;
}
