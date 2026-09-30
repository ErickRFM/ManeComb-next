import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { NextResponse } from "next/server";
import { requireApiSession } from "@/src/lib/auth";
import { assertPermission } from "@/src/lib/authorization";
import { connectDb } from "@/src/lib/db";
import { apiError } from "@/src/lib/http";
import { enforceRateLimit } from "@/src/lib/rate-limit";
import { ActivationKey } from "@/src/core/models/ActivationKey";
import { User } from "@/src/core/models/User";
const Input = z.object({ driverId:z.string().min(1), vehicleId:z.string().min(1).optional(), ttlHours:z.number().int().min(1).max(720).default(72) });
export const runtime="nodejs";
export async function POST(request:Request){
  try{
    const session=assertPermission(await requireApiSession(request,["company_portal"]),"manage_users");
    if(!session.organizationId) throw new Error("FORBIDDEN");
    await enforceRateLimit(request,"activation-keys:create",{limit:20,windowSeconds:600,identity:session.sub});
    const input=Input.parse(await request.json());
    await connectDb();
    const driver=await User.exists({_id:input.driverId,organizationId:session.organizationId,channel:"mobile_operations",active:true});
    if(!driver) throw new Error("Driver not found");
    const code=randomBytes(12).toString("base64url").toUpperCase();
    const codeHash=createHash("sha256").update(code).digest("hex");
    const expiresAt=new Date(Date.now()+input.ttlHours*60*60*1000);
    await ActivationKey.create({organizationId:session.organizationId,driverId:input.driverId,vehicleId:input.vehicleId||null,codeHash,expiresAt});
    return NextResponse.json({code,expiresAt},{status:201});
  }catch(error){return apiError(error)}
}
