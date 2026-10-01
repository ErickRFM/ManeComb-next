import { ModuleShell } from "@/src/components/module-shell";
import { DriverNavigation } from "@/src/components/driver-navigation";
export default function NavigationPage(){
  return <ModuleShell eyebrow="NAVEGACIÓN" title="Ruta asignada" description="Consulta las paradas, el avance y la llegada estimada de tu recorrido."><DriverNavigation/></ModuleShell>
}
