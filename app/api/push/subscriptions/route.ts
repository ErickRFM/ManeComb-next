import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiSession } from "@/src/lib/auth";
import { connectDb } from "@/src/lib/db";
import { apiError } from "@/src/lib/http";
import { PushSubscription } from "@/src/core/models/PushSubscription";
const SubscriptionSchema=z.object({endpoint:z.string().url(),keys:z.object({p256dh:z.string().min(1),auth:z.string().min(1)})});
export const runtime="nodejs";
export async function POST(request:Request){
  try{
    const session=await requireApiSession(request,["company_portal","mobile_operations"]);
    if(!session.organizationId)throw new Error("FORBIDDEN");
    const input=SubscriptionSchema.parse(await request.json());
    await connectDb();
    await PushSubscription.findOneAndUpdate(
      {endpoint:input.endpoint},
      {$set:{organizationId:session.organizationId,userId:session.sub,keys:input.keys,userAgent:request.headers.get("user-agent")||undefined,active:true}},
      {upsert:true,new:true}
    );
    return NextResponse.json({ok:true});
  }catch(error){return apiError(error)}
}
export async function DELETE(request:Request){
  try{
    const session=await requireApiSession(request,["company_portal","mobile_operations"]);
    const input=z.object({endpoint:z.string().url()}).parse(await request.json());
    await connectDb();
    await PushSubscription.updateOne({endpoint:input.endpoint,userId:session.sub},{$set:{active:false}});
    return NextResponse.json({ok:true});
  }catch(error){return apiError(error)}
}
