import { ModuleShell } from "@/src/components/module-shell";
import { SubscriptionPanel } from "@/src/components/subscription-panel";
export default function BillingPage(){
  return <ModuleShell eyebrow="FACTURACIÓN" title="Plan y pagos" description="Estado de suscripción bajo una sola autoridad de servidor; pagos y webhooks no se calculan en cliente."><SubscriptionPanel/></ModuleShell>
}
