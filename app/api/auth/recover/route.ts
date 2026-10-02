import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDb } from "@/src/lib/db";
import { getEnv } from "@/src/lib/env";
import { apiError } from "@/src/lib/http";
import { enforceRateLimit } from "@/src/lib/rate-limit";
import { User } from "@/src/core/models/User";
import { PasswordResetToken } from "@/src/core/models/PasswordResetToken";
import { enqueueOutboxEvent } from "@/src/core/services/outbox";

const Input=z.object({email:z.string().email()});
export const runtime="nodejs";

export async function POST(request:Request){
  try{
    const input=Input.parse(await request.json());
    await enforceRateLimit(request,"auth:recover",{limit:5,windowSeconds:900,identity:input.email});
    await connectDb();
    const user=await User.findOne({email:input.email.toLowerCase(),active:true});
    if(user){
      const token=randomBytes(32).toString("base64url");
      const tokenHash=createHash("sha256").update(token).digest("hex");
      const expiresAt=new Date(Date.now()+30*60*1000);
      await PasswordResetToken.deleteMany({userId:user._id,usedAt:null});
      await PasswordResetToken.create({userId:user._id,tokenHash,expiresAt});
      const resetUrl=getEnv().appUrl+"/restablecer-password?token="+encodeURIComponent(token);
      await enqueueOutboxEvent("email.send",{
        to:user.email,
        subject:"Restablece tu contraseña de ManeComb",
        html:"<h1>Restablecer contraseña</h1><p>Este enlace vence en 30 minutos.</p><p><a href=\""+resetUrl+"\">Crear nueva contraseña</a></p><p>Si no solicitaste el cambio, ignora este correo.</p>"
      },user.organizationId?String(user.organizationId):null,"password-reset:"+tokenHash);
    }
    return NextResponse.json({ok:true});
  }catch(error){return apiError(error)}
}
