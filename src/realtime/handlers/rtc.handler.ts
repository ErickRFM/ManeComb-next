import type { Server, Socket } from "socket.io";
import { RtcSignalSchema } from "@/src/core/contracts/realtime";
import { connectDb } from "@/src/lib/db";
import { User } from "@/src/core/models/User";

export function registerRtcHandler(io: Server, socket: Socket) {
  socket.on("rtc:signal", async (payload, ack) => {
    try {
      const session = socket.data.session;
      if (!session?.organizationId) throw new Error("FORBIDDEN");
      const input = RtcSignalSchema.parse(payload);
      await connectDb();
      const target = await User.exists({ _id: input.targetUserId, organizationId: session.organizationId, active: true });
      if (!target) throw new Error("RTC_TARGET_NOT_FOUND");
      io.to("user:" + input.targetUserId).emit("rtc:signal", { fromUserId: session.sub, signal: input.signal });
      ack?.({ ok: true });
    } catch (error) {
      ack?.({ ok: false, error: error instanceof Error ? error.message : "RTC_ERROR" });
    }
  });
}
