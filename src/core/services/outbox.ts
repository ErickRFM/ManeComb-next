import mongoose from "mongoose";
import { OutboxEvent } from "@/src/core/models/OutboxEvent";

export async function enqueueOutboxEvent(type: string, payload: unknown, organizationId?: string | null, idempotencyKey?: string) {
  if(idempotencyKey){
    if(mongoose.Types.ObjectId.isValid(idempotencyKey)){
      return OutboxEvent.findOneAndUpdate(
        {_id:idempotencyKey},
        {$setOnInsert:{_id:idempotencyKey,type,payload,organizationId:organizationId||null,status:"pending"}},
        {upsert:true,new:true}
      );
    }
    return OutboxEvent.findOneAndUpdate(
      {idempotencyKey},
      {$setOnInsert:{type,payload,organizationId:organizationId||null,status:"pending",idempotencyKey}},
      {upsert:true,new:true}
    );
  }
  return OutboxEvent.create({ type, payload, organizationId: organizationId || null, status: "pending" });
}
