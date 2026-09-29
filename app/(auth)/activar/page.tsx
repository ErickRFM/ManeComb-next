import { ModuleShell } from "@/src/components/module-shell";
import { ActivationForm } from "@/src/components/activation-form";
export default function ActivatePage(){
  return <ModuleShell eyebrow="CHOFER" title="Activar dispositivo" description="La llave vincula el conductor y la unidad sin compartir contraseñas."><ActivationForm/></ModuleShell>
}
