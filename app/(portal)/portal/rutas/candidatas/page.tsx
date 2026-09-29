import { ModuleShell } from "@/src/components/module-shell";
import { RouteCandidates } from "@/src/components/route-candidates";
export default function CandidatesPage(){
  return <ModuleShell eyebrow="AUTO-ROUTE" title="Rutas aprendidas" description="ManeComb analiza jornadas terminadas, simplifica una traza representativa y exige aprobación humana antes de cambiar la ruta activa."><RouteCandidates/></ModuleShell>
}
