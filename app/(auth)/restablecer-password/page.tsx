import { ModuleShell } from "@/src/components/module-shell";
import { PasswordReset } from "@/src/components/password-reset";
export default async function ResetPage({searchParams}:{searchParams:Promise<{token?:string}>}){
  const {token}=await searchParams;
  return <ModuleShell eyebrow="SEGURIDAD" title="Nueva contraseña" description="Al cambiar la contraseña se revocan todas las sesiones activas.">{token?<PasswordReset token={token}/>:<div className="card">Falta el token de recuperación.</div>}</ModuleShell>
}
