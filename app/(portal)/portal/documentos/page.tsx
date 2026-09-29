import { ModuleShell } from "@/src/components/module-shell";
import { DocumentManager } from "@/src/components/document-manager";

export default function DocumentsPage(){
  return <ModuleShell eyebrow="DOCUMENTOS" title="Validación documental" description="Licencias, circulación, seguros y documentos con vigencia, estado y revisión."><DocumentManager/></ModuleShell>
}
