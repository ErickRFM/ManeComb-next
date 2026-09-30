import { NextResponse } from "next/server";
import { requireApiSession } from "@/src/lib/auth";
import { assertPermission } from "@/src/lib/authorization";
import { connectDb } from "@/src/lib/db";
import { apiError } from "@/src/lib/http";
import { proxyTrustedCloudinaryAsset } from "@/src/lib/cloudinary";
import { Document } from "@/src/core/models/Document";

export const runtime="nodejs";

export async function GET(request:Request,{params}:{params:Promise<{documentId:string}>}){
  try{
    const session=await requireApiSession(request,["company_portal","mobile_operations"]);
    if(!session.organizationId)throw new Error("FORBIDDEN");
    const {documentId}=await params;
    await connectDb();

    const query:Record<string,unknown>={_id:documentId,organizationId:session.organizationId};
    if(session.channel==="mobile_operations"){
      query.ownerType="driver";
      query.ownerId=session.sub;
    }else{
      assertPermission(session,"manage_documents");
    }

    const document=await Document.findOne(query).select("url");
    if(!document)return NextResponse.json({error:"Document not found"},{status:404});
    return proxyTrustedCloudinaryAsset(document.url);
  }catch(error){return apiError(error)}
}
