import { AuditLog } from "@/src/core/models/AuditLog";
import { inferAuditCategory, sanitizeAuditMetadata, type AuditCategory } from "@/src/core/platform/audit-policy";
import type { ClientSession } from "mongoose";

export async function writeAudit(input: {
  organizationId?: string | null;
  actorUserId?: string | null;
  action: string;
  category?: AuditCategory;
  entityType?: string;
  entityId?: string;
  metadata?: unknown;
}, session?: ClientSession) {
  const [record] = await AuditLog.create([{
    organizationId: input.organizationId || null,
    actorUserId: input.actorUserId || null,
    action: input.action,
    category: input.category || inferAuditCategory(input.action),
    entityType: input.entityType,
    entityId: input.entityId,
    metadata: sanitizeAuditMetadata(input.metadata),
    occurredAt: new Date()
  }], { session });
  return record;
}
