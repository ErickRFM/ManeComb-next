import { ModuleShell } from "@/src/components/module-shell";
import { CheckoutPanel } from "@/src/components/checkout-panel";
import { getCommercialPlan } from "@/src/core/domain/commercial-plans";
import { notFound } from "next/navigation";

export default async function CheckoutPage({params}:{params:Promise<{planId:string}>}){
  const {planId}=await params;
  const plan=getCommercialPlan(planId);
  if(!plan)notFound();
  return <ModuleShell eyebrow="CHECKOUT" title={plan.label+" · "+plan.monthlyMxn+" MXN/mes"} description="Revisa tu plan y continúa al pago de tu suscripción mensual."><CheckoutPanel planId={plan.code}/></ModuleShell>
}
