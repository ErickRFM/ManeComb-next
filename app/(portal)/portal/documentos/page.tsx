import { ModuleShell } from "@/src/components/module-shell";
import { DocumentManager } from "@/src/components/document-manager";

export default function DocumentsPage(){
  return <ModuleShell eyebrow="DOCUMENTOS" title="Validación documental" description="Carga, vigencias, revisión y trazabilidad de licencias, circulación, seguros y documentos operativos."><DocumentManager/></ModuleShell>
}
