import { ModuleShell } from "@/src/components/module-shell";
import { PlatformUsersManager } from "@/src/components/platform-users-manager";

export default function PlatformUsersPage(){
  return <ModuleShell eyebrow="GOBIERNO" title="Personal interno" description="Cuentas internas de ManeComb, roles de plataforma y estado de MFA." wide>
    <PlatformUsersManager/>
  </ModuleShell>;
}
