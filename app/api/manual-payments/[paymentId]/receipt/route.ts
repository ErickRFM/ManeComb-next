import { NextResponse } from "next/server";
import { requireApiSession } from "@/src/lib/auth";
import { assertPermission } from "@/src/lib/authorization";
import { connectDb } from "@/src/lib/db";
import { apiError } from "@/src/lib/http";
import { proxyTrustedCloudinaryAsset } from "@/src/lib/cloudinary";
import { ManualPayment } from "@/src/core/models/ManualPayment";

export const runtime="nodejs";

export async function GET(request:Request,{params}:{params:Promise<{paymentId:string}>}){
  try{
    const session=await requireApiSession(request,["company_portal","platform_admin"]);
    const {paymentId}=await params;
    await connectDb();

    const query:Record<string,unknown>={_id:paymentId};
    if(session.channel==="company_portal"){
      if(!session.organizationId)throw new Error("FORBIDDEN");
      assertPermission(session,"manage_billing");
      query.organizationId=session.organizationId;
    }

    const payment=await ManualPayment.findOne(query).select("receiptUrl receiptPublicId receiptResourceType organizationId");
    if(!payment)return NextResponse.json({error:"Payment not found"},{status:404});
    return proxyTrustedCloudinaryAsset(payment.receiptUrl,{organizationId:String(payment.organizationId),kind:"payment",publicId:payment.receiptPublicId||"",resourceType:payment.receiptResourceType});
  }catch(error){return apiError(error)}
}
