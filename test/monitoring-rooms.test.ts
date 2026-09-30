import { afterEach, expect, it, vi } from "vitest";
import { registerPresenceHandler } from "@/src/realtime/handlers/presence.handler";
afterEach(()=>{vi.clearAllTimers();vi.useRealTimers()});
it.each(["company_portal","mobile_operations"])("limits monitoring subscriptions for %s",channel=>{
  vi.useFakeTimers();const join=vi.fn();
  registerPresenceHandler({} as any,{data:{session:{organizationId:"org-a",sub:"user-a",channel}},join,on:vi.fn()} as any);
  const rooms=join.mock.calls.map(([room])=>room);
  expect(rooms).toContain("org:org-a");expect(rooms).toContain("user:user-a");
  expect(rooms.includes("org:org-a:monitor")).toBe(channel==="company_portal");
  expect(rooms.some(room=>room.includes("org-b"))).toBe(false);
});
