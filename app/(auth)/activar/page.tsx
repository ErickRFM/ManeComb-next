import { ModuleShell } from "@/src/components/module-shell";
import { ActivationForm } from "@/src/components/activation-form";
import { OperationAuthLayout } from "@/src/components/operation-auth-layout";

export default async function ActivatePage({searchParams}:{searchParams:Promise<{surface?:string}>}){
  const operation=(await searchParams).surface==="operation";
  if(operation){
    return <OperationAuthLayout active="activate">
      <div className="operation-activation-copy">
        <h1>Activa tu cuenta</h1>
        <p>Usa la llave que te compartió el responsable de tu línea.</p>
      </div>
      <ActivationForm/>
    </OperationAuthLayout>;
  }
  return <ModuleShell eyebrow="CHOFER" title="Activar dispositivo" description="La llave vincula el conductor y la unidad sin compartir contraseñas."><ActivationForm/></ModuleShell>;
}
