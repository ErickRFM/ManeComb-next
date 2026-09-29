import { AuditLog } from "@/src/core/models/AuditLog";

export async function writeAudit(input: {
  organizationId?: string | null;
  actorUserId?: string | null;
  action: string;
  entityType?: string;
  entityId?: string;
  metadata?: unknown;
}) {
  return AuditLog.create({
    organizationId: input.organizationId || null,
    actorUserId: input.actorUserId || null,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    metadata: input.metadata,
    occurredAt: new Date()
  });
}
