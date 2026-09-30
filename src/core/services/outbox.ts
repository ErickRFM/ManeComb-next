import { OutboxEvent } from "@/src/core/models/OutboxEvent";

export async function enqueueOutboxEvent(type: string, payload: unknown, organizationId?: string | null, eventId?: string) {
  if(eventId)return OutboxEvent.findOneAndUpdate({_id:eventId},{$setOnInsert:{type,payload,organizationId:organizationId||null,status:"pending"}},{upsert:true,new:true});
  return OutboxEvent.create({ type, payload, organizationId: organizationId || null, status: "pending" });
}
