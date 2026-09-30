import { ModuleShell } from "@/src/components/module-shell";
import { PortalDashboardOverview } from "@/src/components/portal-dashboard-overview";
import { PushOptIn } from "@/src/components/push-opt-in";

export default function DashboardPage(){
  return <ModuleShell eyebrow="CENTRO DE OPERACIÓN" title="Resumen operativo" description="Vista ejecutiva del estado de flota, telemetría, desvíos e incidencias para decidir qué atender primero." wide>
    <div className="grid"><PortalDashboardOverview/><PushOptIn/></div>
  </ModuleShell>;
}
