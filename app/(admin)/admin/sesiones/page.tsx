import { ModuleShell } from "@/src/components/module-shell";
import { PlatformSessionsManager } from "@/src/components/platform-sessions-manager";

export default function PlatformSessionsPage(){
  return <ModuleShell eyebrow="SEGURIDAD" title="Sesiones administrativas" description="Consulta y revocación controlada de sesiones del personal interno." wide>
    <PlatformSessionsManager/>
  </ModuleShell>;
}
