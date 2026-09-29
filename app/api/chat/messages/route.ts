import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiSession } from "@/src/lib/auth";
import { connectDb } from "@/src/lib/db";
import { apiError } from "@/src/lib/http";
import { hasPermission } from "@/src/core/domain/permissions";
import { Message } from "@/src/core/models/Message";
import { User } from "@/src/core/models/User";

const Query = z.object({
  channelId: z.string().trim().min(1).max(120),
  recipientUserId: z.string().min(1).optional(),
  before: z.coerce.date().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50)
});

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const session = await requireApiSession(request, ["company_portal", "mobile_operations"]);
    if (!session.organizationId || !hasPermission(session.roles, "access_chat")) throw new Error("FORBIDDEN");

    const url = new URL(request.url);
    const query = Query.parse({
      channelId: url.searchParams.get("channelId"),
      recipientUserId: url.searchParams.get("recipientUserId") || undefined,
      before: url.searchParams.get("before") || undefined,
      limit: url.searchParams.get("limit") || undefined
    });

    await connectDb();
    const filter: Record<string, unknown> = {
      organizationId: session.organizationId,
      channelId: query.channelId
    };

    if (query.before) filter.createdAt = { $lt: query.before };

    if (query.recipientUserId) {
      const target = await User.exists({
        _id: query.recipientUserId,
        organizationId: session.organizationId,
        active: true
      });
      if (!target) return NextResponse.json({ error: "Chat target not found" }, { status: 404 });
      filter.$or = [
        { senderUserId: session.sub, recipientUserId: query.recipientUserId },
        { senderUserId: query.recipientUserId, recipientUserId: session.sub }
      ];
    } else if (session.channel === "mobile_operations") {
      filter.recipientUserId = null;
    }

    const rows = await Message.find(filter).sort({ createdAt: -1, _id: -1 }).limit(query.limit + 1).lean();
    const page = rows.slice(0, query.limit);
    return NextResponse.json({
      messages: page.reverse(),
      pageInfo: {
        hasMore: rows.length > query.limit,
        nextBefore: rows.length > query.limit && page.length ? new Date(page[page.length - 1].createdAt).toISOString() : null
      }
    });
  } catch (error) {
    return apiError(error);
  }
}
