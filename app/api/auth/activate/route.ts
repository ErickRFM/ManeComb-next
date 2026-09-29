import { createHash } from "node:crypto";
import { z } from "zod";
import { NextResponse } from "next/server";
import { connectDb } from "@/src/lib/db";
import { apiError } from "@/src/lib/http";
import { createSessionForUser, SESSION_COOKIE } from "@/src/lib/auth";
import { ActivationKey } from "@/src/core/models/ActivationKey";
import { User } from "@/src/core/models/User";
const Input=z.object({code:z.string().min(12).max(128)});
export const runtime="nodejs";
export async function POST(request:Request){
  try{
    const {code}=Input.parse(await request.json());
    const codeHash=createHash("sha256").update(code.trim().toUpperCase()).digest("hex");
    await connectDb();
    const key=await ActivationKey.findOne({codeHash,usedAt:null,revokedAt:null,expiresAt:{$gt:new Date()}});
    if(!key) throw new Error("Activation key invalid or expired");
    const driver=await User.findOne({_id:key.driverId,organizationId:key.organizationId,channel:"mobile_operations",active:true});
    if(!driver) throw new Error("Driver not found");
    key.usedAt=new Date(); await key.save();
    const session=await createSessionForUser(driver);
    const response=NextResponse.json({user:{id:String(driver._id),channel:driver.channel,organizationId:String(driver.organizationId)},vehicleId:key.vehicleId?String(key.vehicleId):null});
    response.cookies.set(SESSION_COOKIE,session.token,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",expires:session.expiresAt});
    return response;
  }catch(error){return apiError(error)}
}
