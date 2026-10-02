import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiSession } from "@/src/lib/auth";
import { assertPermission } from "@/src/lib/authorization";
import { connectDb } from "@/src/lib/db";
import { apiError } from "@/src/lib/http";
import { Document } from "@/src/core/models/Document";
import { writeAudit } from "@/src/core/services/audit";

const Review = z.object({
  status: z.enum(["approved", "rejected"]),
  rejectionReason: z.string().max(500).optional(),
  reviewNotes: z.string().max(1000).optional()
}).refine((value) => value.status !== "rejected" || Boolean(value.rejectionReason?.trim()), {
  message: "Rejection reason is required"
});
export const runtime = "nodejs";

export async function PATCH(request: Request, { params }: { params: Promise<{ documentId: string }> }) {
  try {
    const session = assertPermission(await requireApiSession(request, ["company_portal"]), "manage_documents");
    if (!session.organizationId) throw new Error("FORBIDDEN");
    const { documentId } = await params;
    const input = Review.parse(await request.json());
    await connectDb();

    const document = await Document.findOneAndUpdate(
      { _id: documentId, organizationId: session.organizationId, deletedAt: null },
      {
        $set: {
          status: input.status,
          rejectionReason: input.status === "rejected" ? input.rejectionReason : null,
          reviewNotes: input.reviewNotes || "",
          reviewedBy: session.sub,
          reviewedAt: new Date()
        },
        $inc: { reviewVersion: 1 }
      },
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

const Delete=z.object({reason:z.string().min(3).max(500)});

export async function DELETE(request:Request,{params}:{params:Promise<{documentId:string}>}){
  try{
    const session=assertPermission(await requireApiSession(request,["company_portal"]),"manage_documents");
    if(!session.organizationId)throw new Error("FORBIDDEN");
    const {documentId}=await params;
    const {reason}=Delete.parse(await request.json());
    await connectDb();

    const document=await Document.findOneAndUpdate(
      {_id:documentId,organizationId:session.organizationId,deletedAt:null},
      {$set:{deletedAt:new Date(),deletedBy:session.sub,deleteReason:reason}},
      {new:true}
    );
    if(!document)return NextResponse.json({error:"Document not found"},{status:404});

    await writeAudit({
      organizationId:session.organizationId,
      actorUserId:session.sub,
      action:"document.delete",
      entityType:"Document",
      entityId:String(document._id),
      metadata:{kind:document.kind,ownerType:document.ownerType,ownerId:String(document.ownerId),reason}
    });
    return NextResponse.json({document:{_id:document._id,deletedAt:document.deletedAt}});
  }catch(error){return apiError(error)}
}
