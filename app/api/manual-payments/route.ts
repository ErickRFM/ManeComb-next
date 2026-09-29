import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiSession } from "@/src/lib/auth";
import { connectDb } from "@/src/lib/db";
import { apiError } from "@/src/lib/http";
import { ManualPayment } from "@/src/core/models/ManualPayment";
import { assertPermission } from "@/src/core/domain/permissions";
import { assertManagedAssetReference } from "@/src/lib/managed-assets";
import { writeAudit } from "@/src/core/services/audit";

const Input=z.object({
  amountMxn:z.number().positive().max(1_000_000),
  receiptUrl:z.string().url(),
  storagePublicId:z.string().min(1).max(500),
  resourceType:z.string().min(1).max(50),
  bytes:z.number().int().min(1),
  mimeType:z.string().max(120).optional(),
  fileName:z.string().max(255).optional()
});

export const runtime="nodejs";

export async function GET(request:Request){
  try{
    const session=await requireApiSession(request,["company_portal"]);
    if(!session.organizationId)throw new Error("FORBIDDEN");
    assertPermission(session.roles,"manage_billing");
    await connectDb();
    const payments=await ManualPayment.find({organizationId:session.organizationId}).sort({createdAt:-1}).lean();
    return NextResponse.json({payments});
  }catch(error){return apiError(error)}
}

export async function POST(request:Request){
  try{
    const session=await requireApiSession(request,["company_portal"]);
    if(!session.organizationId)throw new Error("FORBIDDEN");
    assertPermission(session.roles,"manage_billing");
    const input=Input.parse(await request.json());

    assertManagedAssetReference({
      organizationId:session.organizationId,
      kind:"payment",
      url:input.receiptUrl,
      publicId:input.storagePublicId,
      bytes:input.bytes,
      mimeType:input.mimeType
    });

    await connectDb();
    const payment=await ManualPayment.create({organizationId:session.organizationId,...input});
    await writeAudit({
      organizationId:session.organizationId,
      actorUserId:session.sub,
      action:"manual_payment.submit",
      entityType:"ManualPayment",
      entityId:String(payment._id),
      metadata:{amountMxn:payment.amountMxn}
    });
    return NextResponse.json({payment},{status:201});
  }catch(error){return apiError(error)}
}
