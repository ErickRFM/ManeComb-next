import type { Server, Socket } from "socket.io";
import { RadioAudioSchema, RadioFloorSchema } from "@/src/core/contracts/realtime";

const floors = new Map<string, string>();

function floorKey(organizationId: string, channelId: string) {
  return organizationId + ":" + channelId;
}

export function registerRadioHandler(io: Server, socket: Socket) {
  socket.on("radio:request-floor", (payload, ack) => {
    try {
      const session = socket.data.session;
      if (!session?.organizationId) throw new Error("FORBIDDEN");
      const { channelId } = RadioFloorSchema.parse(payload);
      const key = floorKey(session.organizationId, channelId);
      const holder = floors.get(key);
      if (holder && holder !== socket.id) return ack?.({ ok: false, reason: "busy" });
      floors.set(key, socket.id);
      io.to("org:" + session.organizationId).emit("radio:floor", { channelId, userId: session.sub, active: true });
      ack?.({ ok: true });
    } catch (error) {
      ack?.({ ok: false, reason: error instanceof Error ? error.message : "RADIO_ERROR" });
    }
  });

  socket.on("radio:audio", (payload) => {
    const session = socket.data.session;
    if (!session?.organizationId) return;
    const parsed = RadioAudioSchema.safeParse(payload);
    if (!parsed.success) return;
    const key = floorKey(session.organizationId, parsed.data.channelId);
    if (floors.get(key) !== socket.id) return;
    socket.to("org:" + session.organizationId).emit("radio:audio", {
      channelId: parsed.data.channelId,
      userId: session.sub,
      chunk: parsed.data.chunk
    });
  });

  const release = (payload?: unknown) => {
    const session = socket.data.session;
    if (!session?.organizationId) return;
    const parsed = RadioFloorSchema.safeParse(payload);
    if (parsed.success) {
      const key = floorKey(session.organizationId, parsed.data.channelId);
      if (floors.get(key) === socket.id) {
        floors.delete(key);
        io.to("org:" + session.organizationId).emit("radio:floor", { channelId: parsed.data.channelId, userId: session.sub, active: false });
      }
    } else {
      for (const [key, holder] of floors.entries()) if (holder === socket.id) floors.delete(key);
    }
  };

  socket.on("radio:release-floor", release);
  socket.on("disconnect", () => release());
}
