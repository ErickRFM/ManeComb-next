import { NextResponse } from "next/server";
import { extractRequestToken, revokeSession, SESSION_COOKIE, verifySessionToken } from "@/src/lib/auth";
import {DeviceSession} from "@/src/core/models/DeviceSession";
import {disconnectSessionSockets} from "@/src/realtime/runtime";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const token = extractRequestToken(request);
  if (token) {
    const session=await verifySessionToken(token).catch(()=>null);
    if(session){
    try {
      await revokeSession(session.jti);
      if(session.channel==="mobile_operations"&&session.organizationId)await DeviceSession.updateMany({userId:session.sub,organizationId:session.organizationId,revokedAt:null},{$set:{revokedAt:new Date()}});
      await disconnectSessionSockets(session.sub,session.jti);
    } catch {return NextResponse.json({error:"LOGOUT_REVOCATION_UNAVAILABLE"},{status:503})}
    }
  }
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, "", { httpOnly: true, path: "/", expires: new Date(0) });
  return response;
}
