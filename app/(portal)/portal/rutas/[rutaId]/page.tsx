import { ModuleShell } from "@/src/components/module-shell";
import { RouteEditor } from "@/src/components/route-editor";
import { RouteList } from "@/src/components/route-list";
export default async function RouteEditorPage({params}:{params:Promise<{rutaId:string}>}){
  const {rutaId}=await params;
  return <ModuleShell eyebrow="EDITOR" title={rutaId==="nueva"?"Nueva ruta":"Editar ruta"} description="Edita el recorrido y las paradas; guarda una nueva revisión de la ruta."><div className="route-workspace"><aside aria-label="Rutas disponibles"><RouteList compact/></aside><RouteEditor routeId={rutaId}/></div></ModuleShell>
}
