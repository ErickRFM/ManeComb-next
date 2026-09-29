export type CommercialPlan = {
  code: string;
  units: number;
  monthlyMxn: number;
  label: string;
};

export const COMMERCIAL_PLANS: CommercialPlan[] = [
  { code: "fleet-2", units: 2, monthlyMxn: 99, label: "2 combis" },
  { code: "fleet-4", units: 4, monthlyMxn: 159, label: "4 combis" },
  { code: "fleet-6", units: 6, monthlyMxn: 289, label: "6 combis" },
  { code: "fleet-8", units: 8, monthlyMxn: 449, label: "8 combis" },
  { code: "fleet-12", units: 12, monthlyMxn: 729, label: "12 combis" }
];

export function getCommercialPlan(value: string) {
  return COMMERCIAL_PLANS.find((plan) => plan.code === value || String(plan.units) === value) || null;
}
