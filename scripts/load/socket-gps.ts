import { io, type Socket } from "socket.io-client";

const baseUrl = (process.env.LOAD_TEST_BASE_URL || "").replace(/\/$/, "");
const email = process.env.LOAD_TEST_DRIVER_EMAIL || "";
const password = process.env.LOAD_TEST_DRIVER_PASSWORD || "";
const vehicleId = process.env.LOAD_TEST_VEHICLE_ID || "";
const journeyId = process.env.LOAD_TEST_JOURNEY_ID || undefined;
const clientCount = Number(process.env.LOAD_TEST_CLIENTS || "500");
const intervalMs = Number(process.env.LOAD_TEST_INTERVAL_MS || "3000");
const durationMs = Number(process.env.LOAD_TEST_DURATION_MS || "60000");

if (!baseUrl || !email || !password || !vehicleId) {
  throw new Error("Set LOAD_TEST_BASE_URL, LOAD_TEST_DRIVER_EMAIL, LOAD_TEST_DRIVER_PASSWORD and LOAD_TEST_VEHICLE_ID");
}
if (!Number.isFinite(clientCount) || clientCount < 1 || clientCount > 5000) throw new Error("LOAD_TEST_CLIENTS must be 1..5000");
if (!Number.isFinite(intervalMs) || intervalMs < 1000) throw new Error("LOAD_TEST_INTERVAL_MS must be >= 1000");
if (!Number.isFinite(durationMs) || durationMs < 10_000) throw new Error("LOAD_TEST_DURATION_MS must be >= 10000");

function extractSessionToken(response: Response) {
  const setCookie = response.headers.get("set-cookie") || "";
  const match = setCookie.match(/manecomb_session=([^;]+)/);
  if (!match) throw new Error("Login did not return manecomb_session");
  return decodeURIComponent(match[1]);
}

async function login() {
  const response = await fetch(baseUrl + "/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  const data = await response.json().catch(() => ({})) as { error?: string; mfaRequired?: boolean };
  if (!response.ok) throw new Error(data.error || "Load-test login failed");
  if (data.mfaRequired) throw new Error("LOAD_TEST_DRIVER_EMAIL must be a mobile_operations account, not platform_admin");
  return extractSessionToken(response);
}

function connectOne(token: string, index: number) {
  return new Promise<Socket>((resolve, reject) => {
    const socket = io(baseUrl, {
      path: "/socket.io",
      transports: ["websocket"],
      auth: { token },
      forceNew: true,
      reconnection: false,
      timeout: 15_000
    });
    const timer = setTimeout(() => {
      socket.disconnect();
      reject(new Error("Socket " + index + " connect timeout"));
    }, 20_000);
    socket.once("connect", () => {
      clearTimeout(timer);
      resolve(socket);
    });
    socket.once("connect_error", (error) => {
      clearTimeout(timer);
      socket.disconnect();
      reject(error);
    });
  });
}

function percentile(values: number[], p: number) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * p))];
}

const token = await login();
const sockets: Socket[] = [];
let connectionFailures = 0;

for (let start = 0; start < clientCount; start += 50) {
  const size = Math.min(50, clientCount - start);
  const batch = await Promise.allSettled(
    Array.from({ length: size }, (_, offset) => connectOne(token, start + offset))
  );
  for (const result of batch) {
    if (result.status === "fulfilled") sockets.push(result.value);
    else connectionFailures += 1;
  }
  await new Promise((resolve) => setTimeout(resolve, 200));
}

console.log("[load] connected", sockets.length, "of", clientCount, "sockets");

let sent = 0;
let ackOk = 0;
let ackErrors = 0;
const latencies: number[] = [];
let sequence = 0;

const interval = setInterval(() => {
  sequence += 1;
  sockets.forEach((socket, index) => {
    const sentAt = performance.now();
    sent += 1;
    socket.emit("location:update", {
      vehicleId,
      ...(journeyId ? { journeyId } : {}),
      latitude: 19.3139 + ((index % 50) * 0.000001),
      longitude: -98.2404 + ((sequence % 50) * 0.000001),
      speedMps: 8,
      heading: 90,
      accuracy: 8,
      recordedAt: new Date().toISOString()
    }, (ack: { ok?: boolean; error?: string }) => {
      latencies.push(performance.now() - sentAt);
      if (ack?.ok) ackOk += 1;
      else ackErrors += 1;
    });
  });
}, intervalMs);

await new Promise((resolve) => setTimeout(resolve, durationMs));
clearInterval(interval);
await new Promise((resolve) => setTimeout(resolve, 5000));
for (const socket of sockets) socket.disconnect();

const errorRate = sent ? ackErrors / sent : 1;
const summary = {
  requestedClients: clientCount,
  connectedClients: sockets.length,
  connectionFailures,
  intervalMs,
  durationMs,
  sent,
  acknowledgedOk: ackOk,
  acknowledgedErrors: ackErrors,
  errorRate: Number((errorRate * 100).toFixed(2)),
  latencyMs: {
    p50: Math.round(percentile(latencies, 0.50)),
    p95: Math.round(percentile(latencies, 0.95)),
    p99: Math.round(percentile(latencies, 0.99)),
    max: Math.round(Math.max(0, ...latencies))
  }
};

console.log(JSON.stringify(summary, null, 2));

if (sockets.length !== clientCount || errorRate > 0.01 || ackOk === 0) {
  process.exitCode = 1;
}
