import { ModuleShell } from "@/src/components/module-shell";
import { SubscriptionPanel } from "@/src/components/subscription-panel";
import { ManualPayments } from "@/src/components/manual-payments";
export default function BillingPage(){
  return <ModuleShell eyebrow="FACTURACIÓN" title="Plan y pagos" description="Consulta tu suscripción y el estado de tus pagos."><div className="grid"><SubscriptionPanel/><ManualPayments/></div></ModuleShell>
}
