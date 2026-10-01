import { ModuleShell } from "@/src/components/module-shell";
import { LiveMap } from "@/src/components/live-map";

export default function TrackingPage(){
  return <ModuleShell eyebrow="FLOTA" title="Monitoreo en vivo" description="Consulta ubicación, rutas y estado de las unidades de tu empresa." wide>
    <LiveMap/>
  </ModuleShell>;
}
