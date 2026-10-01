import { ModuleShell } from "@/src/components/module-shell";
import { VehicleManager } from "@/src/components/vehicle-manager";
export default function VehiclesPage(){
  return <ModuleShell eyebrow="FLOTA" title="Unidades" description="Registra y administra las unidades de tu empresa."><VehicleManager/></ModuleShell>
}
