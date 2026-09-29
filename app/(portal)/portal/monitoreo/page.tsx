import { ModuleShell } from "@/src/components/module-shell";
import { LiveMap } from "@/src/components/live-map";

export default function TrackingPage(){
  return <ModuleShell eyebrow="FLEET VIEW" title="Monitoreo en vivo" description="Mapa, lista, filtros y detalle permanecen sincronizados con el snapshot operacional del servidor." wide>
    <LiveMap/>
  </ModuleShell>;
}
