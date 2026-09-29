import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiSession } from "@/src/lib/auth";
import { connectDb } from "@/src/lib/db";
import { apiError } from "@/src/lib/http";
import { Message } from "@/src/core/models/Message";
import { hasPermission } from "@/src/core/domain/permissions";

const Query = z.object({
  channelId: z.string().min(1).max(120).default("dispatch"),
  limit: z.coerce.number().int().min(1).max(200).default(100)
});

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const session = await requireApiSession(request, ["company_portal", "mobile_operations"]);
    if (!session.organizationId) throw new Error("FORBIDDEN");
    if (!hasPermission(session.roles, "access_rtc")) throw new Error("FORBIDDEN");

    const url = new URL(request.url);
    const input = Query.parse({
      channelId: url.searchParams.get("channelId") || "dispatch",
      limit: url.searchParams.get("limit") || "100"
    });

    await connectDb();
    const messages = await Message.find({
      organizationId: session.organizationId,
      channelId: input.channelId
    }).sort({ createdAt: -1 }).limit(input.limit).lean();

    return NextResponse.json({ messages: messages.reverse() });
  } catch (error) {
    return apiError(error);
  }
}
