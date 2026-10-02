import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiSession } from "@/src/lib/auth";
import { assertPermission } from "@/src/lib/authorization";
import { connectDb } from "@/src/lib/db";
import { apiError } from "@/src/lib/http";
import { verifyTenantCloudinaryAsset } from "@/src/lib/cloudinary";
import { Document } from "@/src/core/models/Document";
import { User } from "@/src/core/models/User";
import { Vehicle } from "@/src/core/models/Vehicle";
import { writeAudit } from "@/src/core/services/audit";

const Input=z.object({
  ownerType:z.enum(["driver","vehicle","organization"]),
  ownerId:z.string().min(1).optional(),
  kind:z.string().min(1).max(80),
  url:z.string().url(),
  storagePublicId:z.string().min(1).max(500),
  resourceType:z.string().min(1).max(50),
  bytes:z.number().int().min(1).max(10*1024*1024),
  mimeType:z.enum(["image/jpeg","image/png","image/webp","application/pdf"]).optional(),
  fileName:z.string().min(1).max(255).optional(),
  expiresAt:z.coerce.date().optional(),
  replacesDocumentId:z.string().regex(/^[a-f\d]{24}$/i).optional()
});
export const runtime="nodejs";

export async function GET(request:Request){
  try{
    const session=assertPermission(await requireApiSession(request,["company_portal"]),"manage_documents");
    if(!session.organizationId)throw new Error("FORBIDDEN");
    await connectDb();
    const includeHistory=new URL(request.url).searchParams.get("history")==="1";
    const query:any={organizationId:session.organizationId,deletedAt:null};
    if(!includeHistory)query.supersededByDocumentId=null;
    const documents=await Document.find(query).select("-url").sort({createdAt:-1}).lean();
    return NextResponse.json({documents});
  }catch(error){return apiError(error)}
}

export async function POST(request:Request){
  try{
    const session=await requireApiSession(request,["company_portal","mobile_operations"]);
    if(!session.organizationId)throw new Error("FORBIDDEN");
    if(session.channel==="company_portal")assertPermission(session,"manage_documents");
    const input=Input.parse(await request.json());

    const verified=await verifyTenantCloudinaryAsset({
      organizationId:session.organizationId,
      kind:"document",
      url:input.url,
      publicId:input.storagePublicId,
      resourceType:input.resourceType,
      bytes:input.bytes,
      mimeType:input.mimeType
    });

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

    let document:any;
    if(input.replacesDocumentId){
      const mongoSession=await mongoose.startSession();
      try{
        await mongoSession.withTransaction(async()=>{
          const previous=await Document.findOne({
            _id:input.replacesDocumentId,
            organizationId:session.organizationId,
            ownerType,
            ownerId,
            kind:input.kind,
            deletedAt:null,
            supersededByDocumentId:null
          }).session(mongoSession);
          if(!previous)throw new Error("DOCUMENT_REPLACEMENT_NOT_FOUND");

          const created=await Document.create([{
            organizationId:session.organizationId,
            ...input,
            mimeType:verified.mimeType,
            ownerType,
            ownerId,
            version:Number(previous.version||1)+1,
            status:"pending",
            reviewVersion:0,
            replacesDocumentId:previous._id
          }],{session:mongoSession});
          document=created[0];

          const result=await Document.updateOne(
            {_id:previous._id,organizationId:session.organizationId,supersededByDocumentId:null,deletedAt:null},
            {$set:{supersededByDocumentId:document._id}},
            {session:mongoSession}
          );
          if(result.modifiedCount!==1)throw new Error("DOCUMENT_REPLACEMENT_CONFLICT");
        });
      }finally{
        await mongoSession.endSession();
      }
    }else{
      document=await Document.create({
        organizationId:session.organizationId,
        ...input,
        mimeType:verified.mimeType,
        ownerType,
        ownerId,
        version:1,
        reviewVersion:0
      });
    }

    await writeAudit({
      organizationId:session.organizationId,
      actorUserId:session.sub,
      action:input.replacesDocumentId?"document.replace":"document.create",
      entityType:"Document",
      entityId:String(document._id),
      metadata:{kind:document.kind,ownerType:document.ownerType,ownerId:String(document.ownerId),bytes:document.bytes,version:document.version,replacesDocumentId:input.replacesDocumentId||null}
    });
    const result=document.toObject();
    delete result.url;
    return NextResponse.json({document:result},{status:201});
  }catch(error){return apiError(error)}
}
