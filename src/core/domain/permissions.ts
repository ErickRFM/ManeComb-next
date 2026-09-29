import type { AppRole } from "@/src/core/contracts/auth";

export type Permission =
  | "manage_users" | "manage_billing" | "manage_vehicles" | "view_analytics"
  | "access_rtc" | "access_chat" | "access_radio"
  | "manage_routes" | "manage_documents" | "manage_incidents";

const permissions: Record<AppRole, Permission[]> = {
  owner: ["manage_users","manage_billing","manage_vehicles","view_analytics","access_rtc","access_chat","access_radio","manage_routes","manage_documents","manage_incidents"],
  admin: ["manage_users","manage_vehicles","view_analytics","access_rtc","access_chat","access_radio","manage_routes","manage_documents","manage_incidents"],
  dispatcher: ["manage_vehicles","view_analytics","access_rtc","access_chat","access_radio","manage_routes","manage_incidents"],
  supervisor: ["view_analytics","access_rtc","access_chat","access_radio","manage_routes","manage_documents","manage_incidents"],
  billing_manager: ["manage_billing","view_analytics"],
  support: ["view_analytics","access_chat","manage_incidents"],
  viewer: ["view_analytics"],
  driver: ["access_rtc","access_chat","access_radio"]
};

export function hasPermission(roles: AppRole[], permission: Permission) {
  return roles.some((role) => permissions[role]?.includes(permission));
}
