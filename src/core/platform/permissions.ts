import { z } from "zod";
import type { SessionToken } from "@/src/core/contracts/auth";

export const PlatformRoleSchema = z.enum([
  "platform_owner",
  "platform_admin",
  "platform_support",
  "platform_finance",
  "platform_viewer"
]);
export type PlatformRole = z.infer<typeof PlatformRoleSchema>;

export type PlatformPermission =
  | "platform.organizations.read"
  | "platform.organizations.write"
  | "platform.billing.read"
  | "platform.billing.review"
  | "platform.audit.read"
  | "platform.system.read"
  | "platform.releases.read"
  | "platform.releases.write"
  | "platform.users.read"
  | "platform.users.manage"
  | "platform.sessions.read"
  | "platform.sessions.revoke";

const ALL: PlatformPermission[] = [
  "platform.organizations.read","platform.organizations.write",
  "platform.billing.read","platform.billing.review",
  "platform.audit.read","platform.system.read",
  "platform.releases.read","platform.releases.write",
  "platform.users.read","platform.users.manage",
  "platform.sessions.read","platform.sessions.revoke"
];

const ROLE_PERMISSIONS: Record<PlatformRole, PlatformPermission[]> = {
  platform_owner: ALL,
  platform_admin: [
    "platform.organizations.read","platform.organizations.write",
    "platform.billing.read","platform.billing.review",
    "platform.audit.read","platform.system.read",
    "platform.releases.read","platform.releases.write",
    "platform.users.read","platform.sessions.read"
  ],
  platform_support: [
    "platform.organizations.read",
    "platform.audit.read",
    "platform.system.read",
    "platform.users.read",
    "platform.sessions.read"
  ],
  platform_finance: [
    "platform.organizations.read",
    "platform.billing.read",
    "platform.billing.review",
    "platform.audit.read"
  ],
  platform_viewer: [
    "platform.organizations.read",
    "platform.billing.read",
    "platform.audit.read",
    "platform.system.read",
    "platform.releases.read",
    "platform.users.read",
    "platform.sessions.read"
  ]
};

export function effectivePlatformRoles(input: {
  channel: string;
  roles?: readonly string[] | null;
  platformRoles?: readonly string[] | null;
}): PlatformRole[] {
  if (input.channel !== "platform_admin") return [];
  const explicit = (input.platformRoles || [])
    .map(role => PlatformRoleSchema.safeParse(role))
    .filter(result => result.success)
    .map(result => result.data);
  if (explicit.length) return Array.from(new Set(explicit));

  // Transitional compatibility for platform accounts created before RC2.
  // New/updated accounts must carry platformRoles explicitly.
  if (input.roles?.includes("owner")) return ["platform_owner"];
  if (input.roles?.includes("admin")) return ["platform_admin"];
  return [];
}

export function hasPlatformPermission(session: Pick<SessionToken,"channel"|"roles"|"platformRoles">, permission: PlatformPermission) {
  return effectivePlatformRoles(session).some(role => ROLE_PERMISSIONS[role].includes(permission));
}

export function assertPlatformPermission(session: SessionToken, permission: PlatformPermission) {
  if (session.channel !== "platform_admin" || !hasPlatformPermission(session, permission)) throw new Error("FORBIDDEN");
  return session;
}

export function assertAnyPlatformPermission(session: SessionToken, permissions: PlatformPermission[]) {
  if (!permissions.some(permission => hasPlatformPermission(session, permission))) throw new Error("FORBIDDEN");
  return session;
}
