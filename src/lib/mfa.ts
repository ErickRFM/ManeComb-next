import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { jwtVerify, SignJWT } from "jose";
import { parse } from "cookie";
import { getEnv } from "@/src/lib/env";

const MFA_CHALLENGE_COOKIE = "manecomb_mfa_challenge";
const encoder = new TextEncoder();
const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function authKey() {
  const secret = getEnv().authSecret;
  if (!secret || secret.length < 32) throw new Error("AUTH_SECRET must contain at least 32 characters");
  return encoder.encode(secret);
}

function encryptionKey() {
  const secret = getEnv().mfaEncryptionKey;
  if (!secret || secret.length < 32) throw new Error("MFA_ENCRYPTION_KEY must contain at least 32 characters");
  return createHash("sha256").update(secret).digest();
}

export function generateTotpSecret(bytes = 20) {
  return base32Encode(randomBytes(bytes));
}

export function generateTotpCode(secret: string, timeMs = Date.now(), digits = 6, periodSeconds = 30) {
  const key = base32Decode(secret);
  const counter = Math.floor(timeMs / 1000 / periodSeconds);
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64BE(BigInt(counter));
  const digest = createHmac("sha1", key).update(buffer).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);
  return String(binary % 10 ** digits).padStart(digits, "0");
}

export function verifyTotp(secret: string, code: string, timeMs = Date.now()) {
  const normalized = code.replace(/\s+/g, "");
  if (!/^\d{6}$/.test(normalized)) return false;
  for (const window of [-1, 0, 1]) {
    const expected = generateTotpCode(secret, timeMs + window * 30_000);
    const a = Buffer.from(expected);
    const b = Buffer.from(normalized);
    if (a.length === b.length && timingSafeEqual(a, b)) return true;
  }
  return false;
}

export function buildTotpUri(email: string, secret: string) {
  const label = encodeURIComponent("ManeComb:" + email);
  return "otpauth://totp/" + label + "?secret=" + encodeURIComponent(secret) + "&issuer=ManeComb&algorithm=SHA1&digits=6&period=30";
}

export function encryptMfaSecret(secret: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, encrypted].map((part) => part.toString("base64url")).join(".");
}

export function decryptMfaSecret(value: string) {
  const [ivRaw, tagRaw, encryptedRaw] = value.split(".");
  if (!ivRaw || !tagRaw || !encryptedRaw) throw new Error("Invalid MFA secret payload");
  const iv = Buffer.from(ivRaw, "base64url");
  const tag = Buffer.from(tagRaw, "base64url");
  const encrypted = Buffer.from(encryptedRaw, "base64url");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}

export async function signMfaChallenge(userId: string, mode: "setup" | "verify") {
  return new SignJWT({ purpose: "mfa", mode })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(authKey());
}

export async function verifyMfaChallenge(token: string) {
  const { payload } = await jwtVerify(token, authKey());
  if (payload.purpose !== "mfa" || !payload.sub || (payload.mode !== "setup" && payload.mode !== "verify")) {
    throw new Error("INVALID_MFA_CHALLENGE");
  }
  return { userId: payload.sub, mode: payload.mode as "setup" | "verify" };
}

export function extractMfaChallenge(request: Request) {
  const cookies = parse(request.headers.get("cookie") || "");
  return cookies[MFA_CHALLENGE_COOKIE] || null;
}

function base32Encode(value: Buffer) {
  let bits = "";
  for (const byte of value) bits += byte.toString(2).padStart(8, "0");
  let result = "";
  for (let i = 0; i < bits.length; i += 5) {
    result += BASE32_ALPHABET[parseInt(bits.slice(i, i + 5).padEnd(5, "0"), 2)];
  }
  return result;
}

function base32Decode(value: string) {
  const normalized = value.toUpperCase().replace(/=+$/g, "").replace(/\s+/g, "");
  let bits = "";
  for (const char of normalized) {
    const index = BASE32_ALPHABET.indexOf(char);
    if (index < 0) throw new Error("Invalid base32 secret");
    bits += index.toString(2).padStart(5, "0");
  }
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(bytes);
}

export { MFA_CHALLENGE_COOKIE };
