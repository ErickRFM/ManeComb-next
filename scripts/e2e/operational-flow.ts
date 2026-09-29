import { io, type Socket } from "socket.io-client";

type RequestOptions = {
  method?: string;
  token?: string;
  body?: unknown;
};

const baseUrl = (process.env.E2E_BASE_URL || "").replace(/\/$/, "");
if (!baseUrl) throw new Error("E2E_BASE_URL is required");
if (process.env.E2E_CONFIRM_STAGING !== "YES" && !/^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(baseUrl)) {
  throw new Error("Refusing to create E2E data outside localhost without E2E_CONFIRM_STAGING=YES");
}

function sessionToken(response: Response) {
  const setCookie = response.headers.get("set-cookie") || "";
  const match = setCookie.match(/manecomb_session=([^;]+)/);
  if (!match) throw new Error("Expected manecomb_session cookie");
  return decodeURIComponent(match[1]);
}

async function request(path: string, options: RequestOptions = {}) {
  const headers: Record<string, string> = {};
  if (options.body !== undefined) headers["content-type"] = "application/json";
  if (options.token) headers.cookie = "manecomb_session=" + encodeURIComponent(options.token);

  const response = await fetch(baseUrl + path, {
    method: options.method || "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body)
  });
  const data = await response.json().catch(() => ({})) as any;
  if (!response.ok) {
    throw new Error((options.method || "GET") + " " + path + " failed: " + (data.error || response.status));
  }
  return { response, data };
}

function objectId(value: unknown, label: string) {
  const id = String(value || "");
  if (!id) throw new Error(label + " did not return an id");
  return id;
}

function connectSocket(token: string) {
  return new Promise<Socket>((resolve, reject) => {
    const socket = io(baseUrl, {
      path: "/socket.io",
      transports: ["websocket"],
      auth: { token },
      forceNew: true,
      reconnection: false
    });
    const timer = setTimeout(() => {
      socket.disconnect();
      reject(new Error("Socket connection timeout"));
    }, 15_000);
    socket.once("connect", () => {
      clearTimeout(timer);
      resolve(socket);
    });
    socket.once("connect_error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
}

function emitAck(socket: Socket, event: string, payload: unknown) {
  return new Promise<any>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(event + " ack timeout")), 10_000);
    socket.emit(event, payload, (ack: any) => {
      clearTimeout(timer);
      if (!ack?.ok) reject(new Error(event + " failed: " + (ack?.error || ack?.reason || "unknown")));
      else resolve(ack);
    });
  });
}

const stamp = Date.now();
const ownerEmail = "owner-e2e-" + stamp + "@example.com";
const driverEmail = "driver-e2e-" + stamp + "@example.com";
const ownerPassword = "ManeComb-E2E-" + stamp + "!";
const driverPin = "Driver-" + String(stamp).slice(-8) + "!";

console.log("[e2e] creating tenant");
const registration = await request("/api/auth/register", {
  method: "POST",
  body: {
    organizationName: "ManeComb E2E " + stamp,
    name: "E2E Owner",
    email: ownerEmail,
    password: ownerPassword
  }
});
const ownerToken = sessionToken(registration.response);
const organizationId = objectId(registration.data.organizationId, "registration");

console.log("[e2e] creating vehicle");
const vehicleResponse = await request("/api/vehicles", {
  method: "POST",
  token: ownerToken,
  body: { economicNumber: "E2E-" + String(stamp).slice(-6), plates: "E2E123", capacity: 18 }
});
const vehicleId = objectId(vehicleResponse.data.vehicle?._id, "vehicle");

console.log("[e2e] creating route");
const routeResponse = await request("/api/routes", {
  method: "POST",
  token: ownerToken,
  body: {
    name: "Ruta E2E " + stamp,
    origin: "Inicio",
    destination: "Fin",
    geometry: [
      { latitude: 19.3139, longitude: -98.2404 },
      { latitude: 19.3180, longitude: -98.2350 }
    ],
    stops: [],
    status: "active"
  }
});
const routeId = objectId(routeResponse.data.route?._id, "route");

console.log("[e2e] creating driver and activation key");
const driverResponse = await request("/api/drivers", {
  method: "POST",
  token: ownerToken,
  body: { name: "E2E Driver", email: driverEmail, pin: driverPin }
});
const driverId = objectId(driverResponse.data.driver?.id, "driver");

const activationKeyResponse = await request("/api/activation-keys", {
  method: "POST",
  token: ownerToken,
  body: { driverId, vehicleId, ttlHours: 1 }
});
const activationCode = String(activationKeyResponse.data.code || "");
if (!activationCode) throw new Error("Activation key missing");

const activation = await request("/api/auth/activate", {
  method: "POST",
  body: { code: activationCode }
});
const driverToken = sessionToken(activation.response);

console.log("[e2e] assigning and starting journey");
const assignment = await request("/api/journeys", {
  method: "PUT",
  token: ownerToken,
  body: { vehicleId, driverId, routeId }
});
const journeyId = objectId(assignment.data.journey?._id, "journey");

await request("/api/journeys", {
  method: "POST",
  token: driverToken,
  body: {
    journeyId,
    action: "ready",
    checklist: {
      brakes: true,
      tires: true,
      lights: true,
      fuel: true,
      cleanliness: true,
      odometerStartKm: 1000
    }
  }
});
await request("/api/journeys", {
  method: "POST",
  token: driverToken,
  body: { journeyId, action: "start" }
});

console.log("[e2e] posting telemetry");
await request("/api/locations/telemetry", {
  method: "POST",
  token: driverToken,
  body: {
    vehicleId,
    journeyId,
    latitude: 19.3139,
    longitude: -98.2404,
    speedMps: 7,
    heading: 90,
    accuracy: 6,
    recordedAt: new Date().toISOString()
  }
});

console.log("[e2e] exercising chat and PTT realtime");
const socket = await connectSocket(driverToken);
try {
  await emitAck(socket, "chat:message", {
    channelId: "dispatch",
    clientMessageId: "e2e-" + stamp,
    kind: "text",
    body: "Mensaje E2E " + stamp
  });
  await emitAck(socket, "radio:request-floor", { channelId: "e2e" });
  socket.emit("radio:audio", {
    channelId: "e2e",
    chunk: "data:audio/webm;base64,AAAA"
  });
  socket.emit("radio:release-floor", { channelId: "e2e" });
} finally {
  socket.disconnect();
}

console.log("[e2e] reporting SOS");
const incident = await request("/api/incidents", {
  method: "POST",
  token: driverToken,
  body: {
    vehicleId,
    type: "sos",
    message: "SOS de certificación E2E",
    latitude: 19.3139,
    longitude: -98.2404
  }
});
const incidentId = objectId(incident.data.incident?._id, "incident");

console.log("[e2e] verifying portal visibility");
const live = await request("/api/locations/live", { token: ownerToken });
const unit = (live.data.units || []).find((item: any) => String(item.vehicleId) === vehicleId);
if (!unit || !unit.recordedAt || unit.freshness === "never_reported") {
  throw new Error("Live tracking did not expose the E2E vehicle");
}

const history = await request("/api/chat/messages?channelId=dispatch&limit=50", { token: ownerToken });
if (!(history.data.messages || []).some((item: any) => item.clientMessageId === "e2e-" + stamp)) {
  throw new Error("Persistent chat history did not contain the E2E message");
}

console.log("[e2e] closing journey");
await request("/api/journeys", {
  method: "POST",
  token: driverToken,
  body: { journeyId, action: "finish", finalOdometerKm: 1005 }
});

const journeys = await request("/api/journeys", { token: ownerToken });
const finished = (journeys.data.journeys || []).find((item: any) => String(item._id) === journeyId);
if (!finished || finished.state !== "FINISHED") throw new Error("Journey did not reach FINISHED");

console.log(JSON.stringify({
  ok: true,
  organizationId,
  vehicleId,
  routeId,
  driverId,
  journeyId,
  incidentId,
  liveFreshness: unit.freshness
}, null, 2));
