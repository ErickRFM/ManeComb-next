import { ModuleShell } from "@/src/components/module-shell";
import { OrganizationDetail } from "@/src/components/organization-detail";

export default async function OrganizationDetailPage({params}:{params:Promise<{organizationId:string}>}){
  const {organizationId}=await params;
  return <ModuleShell eyebrow="PLATAFORMA" title="Detalle de empresa" description="Estado comercial, operativo y de gobierno de la organización." wide>
    <OrganizationDetail organizationId={organizationId}/>
  </ModuleShell>;
}
