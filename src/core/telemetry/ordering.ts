import type { TemporalDecision } from "./contracts";

export function isValidCanonicalTime(previousAt?:Date|string|null,now=new Date()){
  if(!previousAt)return false;
  const value=new Date(previousAt).getTime();
  return Number.isFinite(value)&&value<=now.getTime()+5000;
}

export function classifyOrdering(temporal:TemporalDecision,previousAt?:Date|string|null):TemporalDecision{
  if(isValidCanonicalTime(previousAt)&&new Date(previousAt!).getTime()>=temporal.canonicalRecordedAt.getTime()){
    return {...temporal,classification:"out_of_order",liveEligible:false,reason:"older_than_canonical"};
  }
  return temporal;
}
