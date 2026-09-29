import { z } from "zod";

export const AppRoleSchema = z.enum([
  "owner", "admin", "dispatcher", "supervisor", "billing_manager", "support", "viewer", "driver"
]);
export type AppRole = z.infer<typeof AppRoleSchema>;

export const ChannelSchema = z.enum(["company_portal", "mobile_operations", "platform_admin"]);
export type Channel = z.infer<typeof ChannelSchema>;

export const SessionTokenSchema = z.object({
  sub: z.string().min(1),
  organizationId: z.string().nullable(),
  roles: z.array(AppRoleSchema),
  channel: ChannelSchema,
  jti: z.string().min(1)
});
export type SessionToken = z.infer<typeof SessionTokenSchema>;
