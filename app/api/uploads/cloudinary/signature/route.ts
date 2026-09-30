import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiSession } from "@/src/lib/auth";
import { assertPermission } from "@/src/lib/authorization";
import { apiError } from "@/src/lib/http";
import { enforceRateLimit } from "@/src/lib/rate-limit";
import { createCloudinaryUploadSignature } from "@/src/lib/cloudinary";

const Input = z.object({ kind: z.enum(["document", "chat","payment"]) });
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const session = await requireApiSession(request, ["company_portal", "mobile_operations"]);
    if (!session.organizationId) throw new Error("FORBIDDEN");
    const { kind } = Input.parse(await request.json());
    await enforceRateLimit(request,"uploads:signature",{limit:30,windowSeconds:300,identity:session.sub});

    if (kind === "document" && session.channel === "company_portal") assertPermission(session, "manage_documents");
    if (kind === "payment") {
      if(session.channel!=="company_portal")throw new Error("FORBIDDEN");
      assertPermission(session,"manage_billing");
    }
    if (kind === "chat") assertPermission(session, "access_chat");

    return NextResponse.json(createCloudinaryUploadSignature({
      organizationId: session.organizationId,
      kind
    }));
  } catch (error) {
    return apiError(error);
  }
}
