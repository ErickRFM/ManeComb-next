import { OutboxEvent } from "@/src/core/models/OutboxEvent";

export async function enqueueOutboxEvent(type: string, payload: unknown, organizationId?: string | null) {
  return OutboxEvent.create({ type, payload, organizationId: organizationId || null, status: "pending" });
}
