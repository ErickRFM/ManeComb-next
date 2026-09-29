import { getCommercialPlan } from "@/src/core/domain/commercial-plans";
import { Subscription } from "@/src/core/models/Subscription";
import { Vehicle } from "@/src/core/models/Vehicle";

export async function requireActiveSubscription(organizationId: string) {
  const subscription = await Subscription.findOne({
    organizationId,
    status: { $in: ["active", "trial"] }
  });

  if (!subscription) throw new Error("SUBSCRIPTION_INACTIVE");
  if (subscription.currentPeriodEnd && subscription.currentPeriodEnd.getTime() < Date.now()) {
    throw new Error("SUBSCRIPTION_EXPIRED");
  }

  const plan = getCommercialPlan(subscription.planCode);
  if (!plan) throw new Error("SUBSCRIPTION_PLAN_INVALID");

  return { subscription, plan };
}

export async function requireVehicleCapacity(organizationId: string) {
  const { subscription, plan } = await requireActiveSubscription(organizationId);
  const limit = subscription.vehicleLimit || plan.units;
  const used = await Vehicle.countDocuments({
    organizationId,
    status: { $ne: "archived" }
  });
  if (used >= limit) throw new Error("VEHICLE_LIMIT_REACHED");
  return { subscription, plan, used, limit };
}
