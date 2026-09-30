import { NextResponse } from "next/server";
import { requireApiSession } from "@/src/lib/auth";
import { connectDb } from "@/src/lib/db";
import { apiError } from "@/src/lib/http";
import { hasPermission } from "@/src/core/domain/permissions";
import { Message } from "@/src/core/models/Message";
import { proxyTrustedCloudinaryAsset } from "@/src/lib/cloudinary";
export const runtime="nodejs";
export async function GET(request:Request,{params}:{params:Promise<{messageId:string}>}){
  try{
    const session=await requireApiSession(request,["company_portal","mobile_operations"]);
    if(!session.organizationId||!hasPermission(session.roles,"access_chat"))throw new Error("FORBIDDEN");
    const {messageId}=await params;
    await connectDb();
    const message=await Message.findOne({_id:messageId,organizationId:session.organizationId,kind:"image"});
    if(!message?.attachment)return NextResponse.json({error:"Attachment not found"},{status:404});
    if(message.recipientUserId&&String(message.senderUserId)!==session.sub&&String(message.recipientUserId)!==session.sub)throw new Error("FORBIDDEN");
    return proxyTrustedCloudinaryAsset(message.attachment.url,{organizationId:session.organizationId,kind:"chat",publicId:message.attachment.publicId,resourceType:message.attachment.resourceType});
  }catch(error){return apiError(error)}
}
