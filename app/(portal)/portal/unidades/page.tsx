import { ModuleShell } from "@/src/components/module-shell";
import { VehicleManager } from "@/src/components/vehicle-manager";
export default function VehiclesPage(){
  return <ModuleShell eyebrow="FLOTA" title="Unidades" description="Alta y consulta de unidades con aislamiento multitenant y auditoría de creación."><VehicleManager/></ModuleShell>
}
