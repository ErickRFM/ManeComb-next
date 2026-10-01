import { ModuleShell } from "@/src/components/module-shell";
import { MfaForm } from "@/src/components/mfa-form";

export default async function MfaPage({searchParams}:{searchParams:Promise<{surface?:string}>}) {
  return <ModuleShell operation={(await searchParams).surface==="operation"} eyebrow="MFA" title="Verificación de administrador" description="Confirma el código de tu aplicación de autenticación."><MfaForm /></ModuleShell>;
}
