import { ModuleShell } from "@/src/components/module-shell";
import { DriverNavigation } from "@/src/components/driver-navigation";
export default function NavigationPage(){
  return <ModuleShell eyebrow="NAVEGACIÓN" title="Ruta asignada" description="Paradas, avance, desviación y ETA vienen del snapshot operacional calculado por el servidor."><DriverNavigation/></ModuleShell>
}
