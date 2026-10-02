import { ModuleShell } from "@/src/components/module-shell";
import { AdminCommercialOverview } from "@/src/components/admin-commercial-overview";

export default function AdminCommercialPage(){
  return <ModuleShell eyebrow="COMERCIAL" title="Estado comercial global" description="Suscripciones, proveedores, periodos y señales de conciliación de todas las empresas." wide>
    <AdminCommercialOverview/>
  </ModuleShell>;
}
