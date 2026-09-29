import { ModuleShell } from "@/src/components/module-shell";
import { RouteList } from "@/src/components/route-list";
export default function RoutesPage(){
  return <ModuleShell eyebrow="RUTAS" title="Rutas y paradas" description="Geometría versionada, paradas ordenadas, geocercas y estado de publicación."><RouteList/></ModuleShell>
}
