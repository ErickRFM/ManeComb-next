import { ModuleShell } from "@/src/components/module-shell";
import { PasswordReset } from "@/src/components/password-reset";
import { OperationAuthLayout } from "@/src/components/operation-auth-layout";
export default async function ResetPage({searchParams}:{searchParams:Promise<{token?:string;surface?:string}>}){
  const {token,surface}=await searchParams;
  if(surface==="operation")return <OperationAuthLayout active="recovery">
    <div className="operation-activation-copy"><h1>Nueva contraseña</h1><p>Al cambiar la contraseña se revocan todas las sesiones activas.</p></div>
    {token?<PasswordReset token={token}/>:<p role="alert">Falta el token de recuperación.</p>}
  </OperationAuthLayout>;
  return <ModuleShell eyebrow="SEGURIDAD" title="Nueva contraseña" description="Al cambiar la contraseña se revocan todas las sesiones activas.">{token?<PasswordReset token={token}/>:<div className="card">Falta el token de recuperación.</div>}</ModuleShell>
}
