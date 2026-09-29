import { ModuleShell } from "@/src/components/module-shell";
import { LiveMap } from "@/src/components/live-map";
export default function TrackingPage(){return <ModuleShell eyebrow="TRACKING" title="Monitoreo en vivo" description="Mapa sincronizado con OperationalUnitSnapshot, Socket.IO y semáforo de frescura GPS."><LiveMap/></ModuleShell>}
