import type { AppRole } from "@/src/core/contracts/auth";

export type Permission =
  | "manage_users" | "manage_billing" | "manage_vehicles" | "view_analytics"
  | "access_rtc" | "manage_routes" | "manage_documents" | "manage_incidents";

const permissions: Record<AppRole, Permission[]> = {
  owner: ["manage_users","manage_billing","manage_vehicles","view_analytics","access_rtc","manage_routes","manage_documents","manage_incidents"],
  admin: ["manage_users","manage_vehicles","view_analytics","access_rtc","manage_routes","manage_documents","manage_incidents"],
  dispatcher: ["manage_vehicles","view_analytics","access_rtc","manage_routes","manage_incidents"],
  supervisor: ["view_analytics","access_rtc","manage_routes","manage_documents","manage_incidents"],
  billing_manager: ["manage_billing","view_analytics"],
  support: ["view_analytics","manage_incidents"],
  viewer: ["view_analytics"],
  driver: ["access_rtc"]
};

export function hasPermission(roles: AppRole[], permission: Permission) {
  return roles.some((role) => permissions[role].includes(permission));
}

export function hasAnyPermission(roles: AppRole[], required: Permission[]) {
  return required.some((permission) => hasPermission(roles, permission));
}

export function assertPermission(roles: AppRole[], permission: Permission) {
  if (!hasPermission(roles, permission)) throw new Error("FORBIDDEN");
}

export function assertAnyPermission(roles: AppRole[], required: Permission[]) {
  if (!hasAnyPermission(roles, required)) throw new Error("FORBIDDEN");
}
