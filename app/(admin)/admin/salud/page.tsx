import { ModuleShell } from "@/src/components/module-shell";
import { HealthPanel } from "@/src/components/health-panel";
export default function HealthPage(){
  return <ModuleShell eyebrow="SISTEMA" title="Salud de plataforma" description="Estado real de MongoDB, Redis e integraciones del runtime."><HealthPanel/></ModuleShell>
}
