import { ModuleShell } from "@/src/components/module-shell";
import { ActivationForm } from "@/src/components/activation-form";
export default async function ActivatePage({searchParams}:{searchParams:Promise<{surface?:string}>}){
  return <ModuleShell operation={(await searchParams).surface==="operation"} eyebrow="CHOFER" title="Activar dispositivo" description="La llave vincula el conductor y la unidad sin compartir contraseñas."><ActivationForm/></ModuleShell>
}
