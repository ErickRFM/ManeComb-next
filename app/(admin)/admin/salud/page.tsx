import { ModuleShell } from "@/src/components/module-shell";
import { HealthPanel } from "@/src/components/health-panel";
import { PlatformMetrics } from "@/src/components/platform-metrics";

export default function HealthPage(){
  return <ModuleShell eyebrow="SISTEMA" title="Salud y observabilidad" description="Readiness, dependencias, sockets, errores API, latencia GPS y diagnóstico de colas del runtime.">
    <div className="grid">
      <HealthPanel/>
      <PlatformMetrics/>
    </div>
  </ModuleShell>
}
