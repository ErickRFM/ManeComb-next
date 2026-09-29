import { NextResponse } from "next/server";
import { z } from "zod";
import { JourneyActionSchema } from "@/src/core/contracts/journey";
import { requireApiSession } from "@/src/lib/auth";
import { connectDb } from "@/src/lib/db";
import { apiError } from "@/src/lib/http";
import { applyJourneyAction } from "@/src/core/services/journeys";
const InputSchema = z.object({
  journeyId: z.string().min(1),
  action: JourneyActionSchema,
  cancelReason: z.string().max(500).optional(),
  finalOdometerKm: z.number().min(0).optional()
});
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const session = await requireApiSession(request, ["company_portal", "mobile_operations"]);
    if (!session.organizationId) throw new Error("FORBIDDEN");
    const input = InputSchema.parse(await request.json());
    await connectDb();
    const journey = await applyJourneyAction({ ...input, organizationId: session.organizationId, actorUserId: session.sub });
    return NextResponse.json({ journey });
  } catch (error) { return apiError(error); }
}
