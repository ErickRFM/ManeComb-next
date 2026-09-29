import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiSession } from "@/src/lib/auth";
import { connectDb } from "@/src/lib/db";
import { apiError } from "@/src/lib/http";
import { Document } from "@/src/core/models/Document";
const Input=z.object({ownerType:z.enum(["driver","vehicle","organization"]),ownerId:z.string().min(1),kind:z.string().min(1).max(80),url:z.string().url(),expiresAt:z.coerce.date().optional()});
export const runtime="nodejs";
export async function GET(request:Request){
  try{const session=await requireApiSession(request,["company_portal"]);await connectDb();const documents=await Document.find({organizationId:session.organizationId}).sort({createdAt:-1}).lean();return NextResponse.json({documents})}
  catch(error){return apiError(error)}
}
export async function POST(request:Request){
  try{const session=await requireApiSession(request,["company_portal","mobile_operations"]);if(!session.organizationId)throw new Error("FORBIDDEN");const input=Input.parse(await request.json());await connectDb();const document=await Document.create({organizationId:session.organizationId,...input});return NextResponse.json({document},{status:201})}
  catch(error){return apiError(error)}
}
