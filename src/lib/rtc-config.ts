import { createHmac } from "node:crypto";
import { getEnv } from "@/src/lib/env";

export function getRtcIceConfig(userId: string) {
  const env = getEnv();
  const iceServers: Array<{ urls: string | string[]; username?: string; credential?: string }> = [
    { urls: env.rtcStunUrls.length ? env.rtcStunUrls : ["stun:stun.l.google.com:19302"] }
  ];

  let credentialExpiresAt: string | null = null;
  let credentialMode = "stun_only";

  if (env.rtcTurnUrls.length && env.rtcTurnSecret) {
    const expiresAtSeconds = Math.floor(Date.now() / 1000) + 3600;
    const subject = userId.replace(/[^A-Za-z0-9_.-]/g, "-").slice(0, 48) || "manecomb";
    const username = expiresAtSeconds + ":" + subject;
    const credential = createHmac("sha1", env.rtcTurnSecret).update(username).digest("base64");
    iceServers.push({ urls: env.rtcTurnUrls, username, credential });
    credentialExpiresAt = new Date(expiresAtSeconds * 1000).toISOString();
    credentialMode = "coturn_rest";
  } else if (env.rtcTurnUrls.length && env.rtcTurnUsername && env.rtcTurnCredential) {
    iceServers.push({
      urls: env.rtcTurnUrls,
      username: env.rtcTurnUsername,
      credential: env.rtcTurnCredential
    });
    credentialMode = "static";
  }

  return {
    iceServers,
    turnEnabled: iceServers.length > 1,
    credentialExpiresAt,
    credentialMode
  };
}

export function getRtcReadiness() {
  const env = getEnv();
  const dynamic = Boolean(env.rtcTurnUrls.length && env.rtcTurnSecret);
  const staticMode = Boolean(env.rtcTurnUrls.length && env.rtcTurnUsername && env.rtcTurnCredential);
  return { ready: dynamic || staticMode, mode: dynamic ? "turn_dynamic+stun" : staticMode ? "turn_static+stun" : "stun_only" };
}
