import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiSession } from "@/src/lib/auth";
import { connectDb } from "@/src/lib/db";
import { apiError } from "@/src/lib/http";
import { Document } from "@/src/core/models/Document";
import { writeAudit } from "@/src/core/services/audit";
import { hasPermission } from "@/src/core/domain/permissions";

const Review = z.object({
  status: z.enum(["approved", "rejected"]),
  rejectionReason: z.string().max(500).optional()
}).refine((value) => value.status !== "rejected" || Boolean(value.rejectionReason?.trim()), {
  message: "Rejection reason is required"
});

export const runtime = "nodejs";

export async function PATCH(request: Request, { params }: { params: Promise<{ documentId: string }> }) {
  try {
    const session = await requireApiSession(request, ["company_portal"]);
    if (!session.organizationId) throw new Error("FORBIDDEN");
    if (!hasPermission(session.roles, "manage_documents")) throw new Error("FORBIDDEN");
    const { documentId } = await params;
    const input = Review.parse(await request.json());
    await connectDb();

    const document = await Document.findOneAndUpdate(
      { _id: documentId, organizationId: session.organizationId },
      { $set: {
        status: input.status,
        rejectionReason: input.status === "rejected" ? input.rejectionReason : null,
        reviewedBy: session.sub,
        reviewedAt: new Date()
      }},
      { new: true }
    );
    if (!document) return NextResponse.json({ error: "Document not found" }, { status: 404 });

    await writeAudit({
      organizationId: session.organizationId,
      actorUserId: session.sub,
      action: "document." + input.status,
      entityType: "Document",
      entityId: String(document._id),
      metadata: { kind: document.kind, ownerType: document.ownerType, ownerId: String(document.ownerId) }
    });

    return NextResponse.json({ document });
  } catch (error) {
    return apiError(error);
  }
}
