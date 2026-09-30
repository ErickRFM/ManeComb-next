import { NextResponse } from "next/server";
import { requireApiSession } from "@/src/lib/auth";
import { connectDb } from "@/src/lib/db";
import { apiError } from "@/src/lib/http";
import { Subscription } from "@/src/core/models/Subscription";
import mongoose from "mongoose";
import { z } from "zod";
import { assertPermission } from "@/src/lib/authorization";
import { hasPermission } from "@/src/core/domain/permissions";
import { getCommercialPlan } from "@/src/core/domain/commercial-plans";
import { Vehicle } from "@/src/core/models/Vehicle";
import { withVehicleCapacityLock } from "@/src/core/services/vehicle-capacity-lock";
import { mercadoPagoRequest, reconcilePreapproval } from "@/src/core/services/billing";
import { writeAudit } from "@/src/core/services/audit";
import { randomUUID } from "node:crypto";
export const runtime="nodejs";
export async function GET(request:Request){
  try{const session=await requireApiSession(request,["company_portal"]);if(!session.organizationId)throw new Error("FORBIDDEN");await connectDb();const subscription=await Subscription.findOne({organizationId:session.organizationId}).lean();return NextResponse.json({subscription,canManageBilling:hasPermission(session.roles,"manage_billing")})}
  catch(error){return apiError(error)}
}

const Change = z.discriminatedUnion("action", [z.object({action:z.literal("cancel")}), z.object({action:z.literal("changePlan"),planCode:z.string().min(1)})]);

export async function PATCH(request: Request) {
  try {
    const actor = assertPermission(await requireApiSession(request, ["company_portal"]), "manage_billing");
    if (!actor.organizationId) throw new Error("FORBIDDEN");
    const input = Change.parse(await request.json());
    const plan = input.action === "changePlan" ? getCommercialPlan(input.planCode) : null;
    if (input.action === "changePlan" && !plan) throw new Error("SUBSCRIPTION_PLAN_INVALID");
    await connectDb();
    const subscription = await withVehicleCapacityLock(actor.organizationId, async renew => {
      const current = await Subscription.findOne({organizationId:actor.organizationId});
      if (!current || current.provider !== "mercadopago" || !current.providerSubscriptionId) throw new Error("PROVIDER_SUBSCRIPTION_REQUIRED");
      if (plan && await Vehicle.countDocuments({organizationId:actor.organizationId,status:{$ne:"archived"}}) > plan.units) throw new Error("PLAN_CAPACITY_EXCEEDED");
      const endpoint = "/preapproval/" + encodeURIComponent(current.providerSubscriptionId);
      const before = await mercadoPagoRequest(endpoint);
      if (String(before.id) !== current.providerSubscriptionId || String(before.external_reference).split("|")[1] !== actor.organizationId) throw new Error("BILLING_CORRELATION_INVALID");
      if (plan && before.status === "cancelled") throw new Error("SUBSCRIPTION_INACTIVE");
      const operationId = randomUUID();
      await writeAudit({organizationId:actor.organizationId,actorUserId:actor.sub,action:"subscription."+input.action+".requested",entityType:"Subscription",entityId:current.providerSubscriptionId,metadata:{operationId,planCode:plan?.code}});
      await renew();
      await mercadoPagoRequest(endpoint, {method:"PUT",body:JSON.stringify(plan ? {
        reason:"ManeComb "+plan.label,external_reference:`manecomb|${actor.organizationId}|${plan.code}`,
        auto_recurring:{frequency:1,frequency_type:"months",transaction_amount:plan.monthlyMxn,currency_id:"MXN"}
      } : {status:"cancelled"})});
      const confirmed = await mercadoPagoRequest(endpoint);
      if (String(confirmed.id) !== current.providerSubscriptionId ||
        (!plan && confirmed.status !== "cancelled") ||
        (plan && (confirmed.external_reference !== `manecomb|${actor.organizationId}|${plan.code}` || Number(confirmed.auto_recurring?.transaction_amount) !== plan.monthlyMxn || confirmed.auto_recurring?.currency_id !== "MXN"))) throw new Error("BILLING_RECONCILIATION_REQUIRED");
      await renew();
      return mongoose.connection.transaction(transaction => reconcilePreapproval(confirmed, transaction, operationId));
    });
    return NextResponse.json({subscription});
  } catch (error) {
    const code = error instanceof Error ? error.message : "BILLING_RECONCILIATION_REQUIRED";
    if (code.startsWith("BILLING_")) return NextResponse.json({error:code},{status:code === "BILLING_PROVIDER_UNAVAILABLE" ? 502 : 503});
    if (code === "PLAN_CAPACITY_EXCEEDED" || code === "PROVIDER_SUBSCRIPTION_REQUIRED") return NextResponse.json({error:code},{status:409});
    return apiError(error);
  }
}
