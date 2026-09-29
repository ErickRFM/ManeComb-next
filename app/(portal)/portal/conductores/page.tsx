import { ModuleShell } from "@/src/components/module-shell";
import { DriverManager } from "@/src/components/driver-manager";
export default function DriversPage(){
  return <ModuleShell eyebrow="CHOFERES" title="Conductores, activación y jornadas" description="Altas operativas, llaves de enrolamiento, asignación de unidad/ruta y estado de jornadas."><DriverManager/></ModuleShell>
}
