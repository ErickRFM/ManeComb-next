import { ModuleShell } from "@/src/components/module-shell";
import { CheckoutPanel } from "@/src/components/checkout-panel";
import { getCommercialPlan } from "@/src/core/domain/commercial-plans";
import { notFound } from "next/navigation";

export default async function CheckoutPage({params}:{params:Promise<{planId:string}>}){
  const {planId}=await params;
  const plan=getCommercialPlan(planId);
  if(!plan)notFound();
  return <ModuleShell eyebrow="CHECKOUT" title={plan.label+" · "+plan.monthlyMxn+" MXN/mes"} description="Suscripción recurrente con tarifa validada por servidor, idempotencia y conciliación por webhook."><CheckoutPanel planId={plan.code}/></ModuleShell>
}
