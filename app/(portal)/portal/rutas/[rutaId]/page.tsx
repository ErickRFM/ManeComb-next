import { ModuleShell } from "@/src/components/module-shell";
import { RouteEditor } from "@/src/components/route-editor";
export default async function RouteEditorPage({params}:{params:Promise<{rutaId:string}>}){
  const {rutaId}=await params;
  return <ModuleShell eyebrow="EDITOR" title={rutaId==="nueva"?"Nueva ruta":"Editar ruta"} description="La ruta se valida en servidor, queda aislada por organización y cada guardado incrementa revision."><RouteEditor routeId={rutaId}/></ModuleShell>
}
