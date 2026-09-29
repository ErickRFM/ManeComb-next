import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiSession } from "@/src/lib/auth";
import { assertPermission } from "@/src/lib/authorization";
import { connectDb } from "@/src/lib/db";
import { apiError } from "@/src/lib/http";
import { Document } from "@/src/core/models/Document";
import { User } from "@/src/core/models/User";
import { Vehicle } from "@/src/core/models/Vehicle";
import { writeAudit } from "@/src/core/services/audit";

const Input=z.object({
  ownerType:z.enum(["driver","vehicle","organization"]),
  ownerId:z.string().min(1).optional(),
  kind:z.string().min(1).max(80),
  url:z.string().url(),
  storagePublicId:z.string().max(500).optional(),
  resourceType:z.string().max(50).optional(),
  bytes:z.number().int().min(0).optional(),
  expiresAt:z.coerce.date().optional()
});
export const runtime="nodejs";

export async function GET(request:Request){
  try{
    const session=assertPermission(await requireApiSession(request,["company_portal"]),"manage_documents");
    if(!session.organizationId)throw new Error("FORBIDDEN");
    await connectDb();
    const documents=await Document.find({organizationId:session.organizationId}).sort({createdAt:-1}).lean();
    return NextResponse.json({documents});
  }catch(error){return apiError(error)}
}

export async function POST(request:Request){
  try{
    const session=await requireApiSession(request,["company_portal","mobile_operations"]);
    if(!session.organizationId)throw new Error("FORBIDDEN");
    if(session.channel==="company_portal")assertPermission(session,"manage_documents");
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

    await connectDb();
    if(ownerType==="driver"){
      const exists=await User.exists({_id:ownerId,organizationId:session.organizationId,channel:"mobile_operations"});
      if(!exists)throw new Error("DOCUMENT_OWNER_NOT_FOUND");
    }
    if(ownerType==="vehicle"){
      const exists=await Vehicle.exists({_id:ownerId,organizationId:session.organizationId});
      if(!exists)throw new Error("DOCUMENT_OWNER_NOT_FOUND");
    }

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
