import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiSession } from "@/src/lib/auth";
import { connectDb } from "@/src/lib/db";
import { apiError } from "@/src/lib/http";
import { Document } from "@/src/core/models/Document";
import { writeAudit } from "@/src/core/services/audit";
import { hasPermission } from "@/src/core/domain/permissions";
import { assertManagedAssetReference } from "@/src/lib/managed-assets";

const Input=z.object({
  ownerType:z.enum(["driver","vehicle","organization"]),
  ownerId:z.string().min(1).optional(),
  kind:z.string().min(1).max(80),
  url:z.string().url(),
  storagePublicId:z.string().min(1).max(500),
  resourceType:z.string().min(1).max(50),
  bytes:z.number().int().min(1),
  mimeType:z.string().max(120).optional(),
  fileName:z.string().max(255).optional(),
  expiresAt:z.coerce.date().optional()
});

export const runtime="nodejs";

export async function GET(request:Request){
  try{
    const session=await requireApiSession(request,["company_portal"]);
    if(!session.organizationId)throw new Error("FORBIDDEN");
    if(!hasPermission(session.roles,"manage_documents"))throw new Error("FORBIDDEN");
    await connectDb();
    const documents=await Document.find({organizationId:session.organizationId}).sort({createdAt:-1}).lean();
    return NextResponse.json({documents});
  }catch(error){return apiError(error)}
}

export async function POST(request:Request){
  try{
    const session=await requireApiSession(request,["company_portal","mobile_operations"]);
    if(!session.organizationId)throw new Error("FORBIDDEN");
    if(session.channel==="company_portal"&&!hasPermission(session.roles,"manage_documents"))throw new Error("FORBIDDEN");
    const input=Input.parse(await request.json());

    let ownerType=input.ownerType;
    let ownerId=input.ownerId;
    if(session.channel==="mobile_operations"){
      ownerType="driver";
      ownerId=session.sub;
    }else if(ownerType==="organization"){
      ownerId=session.organizationId;
    }
    if(!ownerId)throw new Error("ownerId is required for driver or vehicle documents");

    assertManagedAssetReference({
      organizationId:session.organizationId,
      kind:"document",
      url:input.url,
      publicId:input.storagePublicId,
      bytes:input.bytes,
      mimeType:input.mimeType
    });

    await connectDb();
    const document=await Document.create({
      organizationId:session.organizationId,
      ...input,
      ownerType,
      ownerId
    });

    await writeAudit({
      organizationId:session.organizationId,
      actorUserId:session.sub,
      action:"document.create",
      entityType:"Document",
      entityId:String(document._id),
      metadata:{kind:document.kind,ownerType:document.ownerType,ownerId:String(document.ownerId)}
    });

    return NextResponse.json({document},{status:201});
  }catch(error){return apiError(error)}
}
