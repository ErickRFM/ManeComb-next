import type { TemporalDecision } from "./contracts";

export function classifyOrdering(temporal:TemporalDecision,previousAt?:Date|string|null):TemporalDecision{
  if(previousAt&&new Date(previousAt).getTime()>temporal.canonicalRecordedAt.getTime()){
    return {...temporal,classification:"out_of_order",liveEligible:false,reason:"older_than_canonical"};
  }
  return temporal;
}
