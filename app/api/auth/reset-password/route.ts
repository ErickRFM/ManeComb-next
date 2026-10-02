import { createHash } from "node:crypto";
import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDb } from "@/src/lib/db";
import { apiError } from "@/src/lib/http";
import { enforceRateLimit } from "@/src/lib/rate-limit";
import { PasswordResetToken } from "@/src/core/models/PasswordResetToken";
import { Session } from "@/src/core/models/Session";
import { User } from "@/src/core/models/User";
import { writeAudit } from "@/src/core/services/audit";
import { enqueueAccountNotice } from "@/src/core/services/account-notifications";

const Input=z.object({token:z.string().min(20),password:z.string().min(10).max(128)});
export const runtime="nodejs";

export async function POST(request:Request){
  try{
    const input=Input.parse(await request.json());
    await enforceRateLimit(request,"auth:reset-password",{limit:10,windowSeconds:900,identity:input.token.slice(0,24)});
    const tokenHash=createHash("sha256").update(input.token).digest("hex");
    await connectDb();
    const reset=await PasswordResetToken.findOne({tokenHash,usedAt:null,expiresAt:{$gt:new Date()}});
    if(!reset) return NextResponse.json({error:"RESET_TOKEN_INVALID",message:"El enlace de recuperación es inválido o venció."},{status:400});
    const user=await User.findById(reset.userId);
    if(!user) return NextResponse.json({error:"USER_NOT_FOUND",message:"No fue posible actualizar la contraseña."},{status:404});

    user.passwordHash=await hash(input.password,12);
    user.credentialVersion=Number(user.credentialVersion||0)+1;
    await user.save();

    reset.usedAt=new Date();
    await reset.save();
    await Session.updateMany({userId:user._id,revokedAt:null},{$set:{revokedAt:new Date()}});
    await writeAudit({
      organizationId:user.organizationId?String(user.organizationId):null,
      actorUserId:String(user._id),
      action:"auth.password_reset",
      entityType:"User",
      entityId:String(user._id),
      metadata:{credentialVersion:user.credentialVersion}
    });

    await enqueueAccountNotice({
      to:user.email,
      organizationId:user.organizationId?String(user.organizationId):null,
      idempotencyKey:`password-changed:${String(user._id)}:${user.credentialVersion}`,
      subject:"Tu contraseña de ManeComb fue modificada",
      heading:"Contraseña actualizada",
      body:"La contraseña de tu cuenta ManeComb se modificó correctamente y las sesiones anteriores fueron cerradas."
    }).catch(error=>console.error("[email:password-changed]",error));

    return NextResponse.json({ok:true});
  }catch(error){return apiError(error)}
}
