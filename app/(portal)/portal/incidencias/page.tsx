import { ModuleShell } from "@/src/components/module-shell";
import { IncidentManager } from "@/src/components/incident-manager";
export default function IncidentsPage(){
  return <ModuleShell eyebrow="INCIDENCIAS" title="Centro de alertas" description="Tráfico, fallas, accidentes, operativos, robos, emergencias médicas y SOS con seguimiento de estado."><IncidentManager/></ModuleShell>
}
