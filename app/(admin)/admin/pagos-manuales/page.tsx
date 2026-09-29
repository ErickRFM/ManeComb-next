import { ModuleShell } from "@/src/components/module-shell";
import { AdminManualPayments } from "@/src/components/admin-manual-payments";
export default function ManualPaymentsPage(){
  return <ModuleShell eyebrow="FINANZAS" title="Pagos manuales" description="Revisión y conciliación idempotente de comprobantes con activación de suscripción y auditoría."><AdminManualPayments/></ModuleShell>
}
