import type { Server, Socket } from "socket.io";
import { RadioAudioSchema, RadioFloorSchema } from "@/src/core/contracts/realtime";
import { hasPermission } from "@/src/core/domain/permissions";
import { allowSocketEvent } from "@/src/realtime/socket-rate-limit";
import {
  acquireRadioFloor,
  radioRoom,
  refreshRadioFloor,
  releaseRadioFloor
} from "@/src/realtime/radio-floor";

export function registerRadioHandler(io: Server, socket: Socket) {
  const heldChannels = new Set<string>();
  const joinedChannels = new Set<string>();

  function sessionContext() {
    const session = socket.data.session;
    if (!session?.organizationId || !hasPermission(session.roles,"access_radio")) throw new Error("FORBIDDEN");
    return session;
  }

  socket.on("radio:join", (payload, ack) => {
    try {
      const session = sessionContext();
      const { channelId } = RadioFloorSchema.parse(payload);
      const room = radioRoom(session.organizationId, channelId);
      socket.join(room);
      joinedChannels.add(channelId);
      ack?.({ ok: true, channelId });
    } catch (error) {
      ack?.({ ok: false, reason: error instanceof Error ? error.message : "RADIO_JOIN_ERROR" });
    }
  });

  socket.on("radio:leave", (payload, ack) => {
    try {
      const session = sessionContext();
      const { channelId } = RadioFloorSchema.parse(payload);
      socket.leave(radioRoom(session.organizationId, channelId));
      joinedChannels.delete(channelId);
      ack?.({ ok: true });
    } catch (error) {
      ack?.({ ok: false, reason: error instanceof Error ? error.message : "RADIO_LEAVE_ERROR" });
    }
  });

  socket.on("radio:request-floor", async (payload, ack) => {
    try {
      if(!allowSocketEvent(socket,"radio:floor",20,60_000)) return ack?.({ok:false,reason:"RATE_LIMITED"});
      const session = sessionContext();
      const { channelId } = RadioFloorSchema.parse(payload);
      const owner = socket.id + ":" + session.sub;
      const acquired = await acquireRadioFloor(session.organizationId, channelId, owner);
      if (!acquired) return ack?.({ ok: false, reason: "busy" });

      const room = radioRoom(session.organizationId, channelId);
      if (!joinedChannels.has(channelId)) {
        socket.join(room);
        joinedChannels.add(channelId);
      }
      heldChannels.add(channelId);
      io.to(room).emit("radio:floor", { channelId, userId: session.sub, active: true });
      ack?.({ ok: true });
    } catch (error) {
      ack?.({ ok: false, reason: error instanceof Error ? error.message : "RADIO_ERROR" });
    }
  });

  socket.on("radio:audio", async (payload) => {
    if(!allowSocketEvent(socket,"radio:audio",40,10_000)) return;
    const parsed = RadioAudioSchema.safeParse(payload);
    if (!parsed.success) return;
    try {
      const session = sessionContext();
      const { channelId, chunk } = parsed.data;
      if (!heldChannels.has(channelId)) return;
      const owner = socket.id + ":" + session.sub;
      if (!(await refreshRadioFloor(session.organizationId, channelId, owner))) {
        heldChannels.delete(channelId);
        socket.emit("radio:floor-lost", { channelId });
        return;
      }
      socket.to(radioRoom(session.organizationId, channelId)).emit("radio:audio", {
        channelId,
        userId: session.sub,
        chunk
      });
    } catch {
      return;
    }
  });

  async function releaseChannel(channelId: string) {
    const session = socket.data.session;
    if (!session?.organizationId || !heldChannels.has(channelId)) return;
    const owner = socket.id + ":" + session.sub;
    await releaseRadioFloor(session.organizationId, channelId, owner).catch(() => undefined);
    heldChannels.delete(channelId);
    io.to(radioRoom(session.organizationId, channelId)).emit("radio:floor", {
      channelId,
      userId: session.sub,
      active: false
    });
  }

  socket.on("radio:release-floor", (payload, ack) => {
    const parsed = RadioFloorSchema.safeParse(payload);
    if (!parsed.success) return ack?.({ ok: false, reason: "INVALID_CHANNEL" });
    void releaseChannel(parsed.data.channelId).then(() => ack?.({ ok: true }));
  });

  socket.on("disconnect", () => {
    for (const channelId of heldChannels) void releaseChannel(channelId);
  });
}
