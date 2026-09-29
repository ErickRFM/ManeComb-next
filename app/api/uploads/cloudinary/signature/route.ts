import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiSession } from "@/src/lib/auth";
import { apiError } from "@/src/lib/http";
import { createCloudinaryUploadSignature } from "@/src/lib/cloudinary";
import { hasPermission } from "@/src/core/domain/permissions";

const Input = z.object({ kind: z.enum(["document", "chat", "payment"]) });
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const session = await requireApiSession(request, ["company_portal", "mobile_operations"]);
    if (!session.organizationId) throw new Error("FORBIDDEN");
    const { kind } = Input.parse(await request.json());

    if (kind === "document" && session.channel === "company_portal" && !hasPermission(session.roles, "manage_documents")) {
      throw new Error("FORBIDDEN");
    }
    if (kind === "chat" && !hasPermission(session.roles, "access_rtc")) {
      throw new Error("FORBIDDEN");
    }
    if (kind === "payment" && (session.channel !== "company_portal" || !hasPermission(session.roles, "manage_billing"))) {
      throw new Error("FORBIDDEN");
    }

    return NextResponse.json(createCloudinaryUploadSignature({
      organizationId: session.organizationId,
      kind
    }));
  } catch (error) {
    return apiError(error);
  }
}
