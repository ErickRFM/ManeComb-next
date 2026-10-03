import { ModuleShell } from "@/src/components/module-shell";
import { MfaForm } from "@/src/components/mfa-form";
import { OperationAuthLayout } from "@/src/components/operation-auth-layout";

export default async function MfaPage({searchParams}:{searchParams:Promise<{surface?:string}>}) {
  if((await searchParams).surface==="operation")return <OperationAuthLayout active="recovery">
    <div className="operation-activation-copy"><h1>Verificación de administrador</h1><p>Confirma el código de tu aplicación de autenticación.</p></div><MfaForm/>
  </OperationAuthLayout>;
  return <ModuleShell operation={(await searchParams).surface==="operation"} eyebrow="MFA" title="Verificación de administrador" description="Confirma el código de tu aplicación de autenticación."><MfaForm /></ModuleShell>;
}
