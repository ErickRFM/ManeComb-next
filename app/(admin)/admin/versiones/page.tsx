import { ModuleShell } from "@/src/components/module-shell";
import { AppReleaseManager } from "@/src/components/app-release-manager";
export default function ReleasesPage(){
  return <ModuleShell eyebrow="RELEASES" title="Versiones de App" description="Control de APK publicada, versión mínima permitida y actualización obligatoria para operación móvil."><AppReleaseManager/></ModuleShell>
}
