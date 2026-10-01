import { OutboxEvent } from "@/src/core/models/OutboxEvent";

export async function enqueueOutboxEvent(type: string, payload: unknown, organizationId?: string | null, idempotencyKey?: string) {
  if(idempotencyKey){
    return OutboxEvent.findOneAndUpdate(
      {idempotencyKey},
      {$setOnInsert:{type,payload,organizationId:organizationId||null,status:"pending",idempotencyKey}},
      {upsert:true,new:true}
    );
  }
  return OutboxEvent.create({ type, payload, organizationId: organizationId || null, status: "pending" });
}
