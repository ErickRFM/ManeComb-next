import { ModuleShell } from "@/src/components/module-shell";
import { HealthPanel } from "@/src/components/health-panel";
import { PlatformMetrics } from "@/src/components/platform-metrics";

export default function HealthPage(){
  return <ModuleShell eyebrow="CONTROL CENTER" title="Salud de plataforma" description="Disponibilidad, integraciones y métricas operativas para decidir si ManeComb está listo para servir tráfico real." wide>
    <div className="admin-control-center">
      <HealthPanel/>
      <PlatformMetrics/>
    </div>
  </ModuleShell>;
}
