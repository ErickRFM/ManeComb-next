import { ChannelSchema } from "@/src/core/contracts/auth";

export function channelHome(channel:unknown):string{
  const parsed=ChannelSchema.safeParse(channel);
  if(!parsed.success)throw new Error("SESSION_CHANNEL_INVALID");
  return {company_portal:"/portal/monitoreo",mobile_operations:"/operacion",platform_admin:"/admin/salud"}[parsed.data];
}
