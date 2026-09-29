import type { SessionToken } from "@/src/core/contracts/auth";
import { hasPermission, type Permission } from "@/src/core/domain/permissions";

export function assertPermission(session: SessionToken, permission: Permission) {
  if (!hasPermission(session.roles, permission)) throw new Error("FORBIDDEN");
  return session;
}

export function assertAnyPermission(session: SessionToken, required: Permission[]) {
  if (!required.some((permission) => hasPermission(session.roles, permission))) {
    throw new Error("FORBIDDEN");
  }
  return session;
}
