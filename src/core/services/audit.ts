import { AuditLog } from "@/src/core/models/AuditLog";
import type { ClientSession } from "mongoose";

export async function writeAudit(input: {
  organizationId?: string | null;
  actorUserId?: string | null;
  action: string;
  entityType?: string;
  entityId?: string;
  metadata?: unknown;
}, session?: ClientSession) {
  const [record] = await AuditLog.create([{
    organizationId: input.organizationId || null,
    actorUserId: input.actorUserId || null,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    metadata: input.metadata,
    occurredAt: new Date()
  }], { session });
  return record;
}
