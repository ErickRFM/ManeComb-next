import { ModuleShell } from "@/src/components/module-shell";
import { OrganizationManager } from "@/src/components/organization-manager";
export default function CompaniesPage(){
  return <ModuleShell eyebrow="PLATAFORMA" title="Empresas" description="Gobierno multitenant de concesionarias, estado de servicio y plan contratado."><OrganizationManager/></ModuleShell>
}
