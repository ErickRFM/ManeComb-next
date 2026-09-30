import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { io, type Socket } from "socket.io-client";

type LoadCounts = {
  requestedClients: number; connectedClients: number; connectionFailures: number;
  sent: number; acknowledgedOk: number; acknowledgedErrors: number; timedOut: number;
  latencies: number[];
};
type LoadConfig = {
  baseUrl: string; email: string; password: string; vehicleId: string; journeyId: string;
  clients: number; intervalMs: number; durationMs: number; ackTimeoutMs: number;
  confirmStaging?: boolean;
};

export function integerSetting(value: string | undefined, fallback: number, min: number, max: number, name: string) {
  const number = value === undefined ? fallback : Number(value);
  if (!Number.isSafeInteger(number) || number < min || number > max) throw new Error(name + " must be an integer in " + min + ".." + max);
  return number;
}

export function assertLoadTarget(value: string, confirmStaging = false) {
  let url: URL;
  try { url = new URL(value); } catch { throw new Error("LOAD_TEST_BASE_URL must be a valid URL"); }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash || url.pathname !== '/') {
    throw new Error("Load target must be an HTTP(S) origin without credentials, query or path");
  }
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (!local && (!confirmStaging || url.protocol !== 'https:')) {
    throw new Error("Remote load requires HTTPS and LOAD_TEST_CONFIRM_STAGING=YES for an isolated staging fixture");
  }
  return url.origin;
}

export function summarizeLoad(counts: LoadCounts) {
  const missing = Math.max(counts.timedOut, counts.sent - counts.acknowledgedOk - counts.acknowledgedErrors);
  const errorRate = counts.sent ? (counts.acknowledgedErrors + missing) / counts.sent : 1;
  const sorted = [...counts.latencies].sort((a, b) => a - b);
  const percentile = (p: number) => sorted.length ? Math.round(sorted[Math.max(0, Math.ceil(sorted.length * p) - 1)]) : null;
  return {
    requestedClients: counts.requestedClients, connectedClients: counts.connectedClients,
    connectionFailures: counts.connectionFailures, sent: counts.sent,
    acknowledgedOk: counts.acknowledgedOk, acknowledgedErrors: counts.acknowledgedErrors,
    missingAcknowledgments: missing, errorPercent: Number((errorRate * 100).toFixed(2)),
    latencyMs: { p50: percentile(.50), p95: percentile(.95), p99: percentile(.99), max: sorted.length ? Math.round(sorted[sorted.length - 1]) : null },
    failed: counts.connectedClients !== counts.requestedClients || missing > 0 || errorRate > .01 || counts.acknowledgedOk === 0
  };
}

export async function runGpsLoad(config: LoadConfig) {
  const baseUrl = assertLoadTarget(config.baseUrl, config.confirmStaging);
  for (const [name, value, min, max] of [
    ['clients', config.clients, 1, 5000], ['intervalMs', config.intervalMs, 1000, 60_000],
    ['durationMs', config.durationMs, 10_000, 3_600_000], ['ackTimeoutMs', config.ackTimeoutMs, 100, 60_000]
  ] as const) integerSetting(String(value), value, min, max, name);
  if (!config.email || !config.password || !config.vehicleId || !config.journeyId) throw new Error("Load requires driver credentials and assigned RUNNING vehicle/journey IDs");

  const sockets = new Set<Socket>();
  const pending = new Set<Promise<void>>();
  const counts: LoadCounts = { requestedClients: config.clients, connectedClients: 0, connectionFailures: 0, sent: 0, acknowledgedOk: 0, acknowledgedErrors: 0, timedOut: 0, latencies: [] };
  let aborted = false;
  const abort = () => { aborted = true; for (const socket of sockets) socket.disconnect(); };
  process.once('SIGINT', abort);
  process.once('SIGTERM', abort);
  try {
    const response = await fetch(baseUrl + '/api/auth/login', {
      method: 'POST', headers: { 'content-type': 'application/json' }, redirect: 'error',
      signal: AbortSignal.timeout(15_000), body: JSON.stringify({ email: config.email, password: config.password })
    });
    const data = await response.json() as { mfaRequired?: boolean };
    const match = (response.headers.get('set-cookie') || '').match(/manecomb_session=([^;]+)/);
    if (!response.ok || data.mfaRequired || !match) throw new Error("Load driver login failed or requires MFA");
    const token = decodeURIComponent(match[1]);
    const connectOne = () => new Promise<void>((accept, reject) => {
      const socket = io(baseUrl, { path: '/socket.io', transports: ['websocket'], auth: { token }, forceNew: true, reconnection: false, timeout: 15_000 });
      sockets.add(socket);
      const timer = setTimeout(() => finish(false), 20_000);
      const finish = (ok: boolean) => {
        clearTimeout(timer); socket.off('connect', onConnect); socket.off('connect_error', onError);
        if (ok) { counts.connectedClients++; accept(); }
        else { socket.disconnect(); sockets.delete(socket); reject(new Error('Socket connection failed')); }
      };
      const onConnect = () => finish(true);
      const onError = () => finish(false);
      socket.once('connect', onConnect); socket.once('connect_error', onError);
    });
    for (let start = 0; start < config.clients && !aborted; start += 50) {
      const batch = await Promise.allSettled(Array.from({ length: Math.min(50, config.clients - start) }, connectOne));
      counts.connectionFailures += batch.filter(result => result.status === 'rejected').length;
    }
    console.log('[load] connected ' + counts.connectedClients + '/' + config.clients + '; one assigned vehicle');
    const deadline = performance.now() + config.durationMs;
    while (!aborted && performance.now() < deadline) {
      const tickStart = performance.now();
      for (const socket of sockets) {
        const sentAt = performance.now();
        counts.sent++;
        const ack = new Promise<void>(accept => {
          let settled = false;
          const finish = (result: 'ok' | 'error' | 'timeout') => {
            if (settled) return;
            settled = true; clearTimeout(timer);
            if (result === 'timeout') counts.timedOut++;
            else { counts.latencies.push(performance.now() - sentAt); if (result === 'ok') counts.acknowledgedOk++; else counts.acknowledgedErrors++; }
            accept();
          };
          const timer = setTimeout(() => finish('timeout'), config.ackTimeoutMs);
          socket.emit('location:update', {
            packetId: randomUUID(), vehicleId: config.vehicleId, journeyId: config.journeyId,
            latitude: 19.3139, longitude: -98.2404, speedMps: 8, heading: 90, accuracy: 8,
            recordedAt: new Date().toISOString()
          }, (answer: { ok?: boolean }) => finish(answer?.ok ? 'ok' : 'error'));
        });
        pending.add(ack);
        void ack.then(() => pending.delete(ack));
      }
      await new Promise(accept => setTimeout(accept, Math.ceil(Math.min(Math.max(0, config.intervalMs - (performance.now() - tickStart)), Math.max(0, deadline - performance.now())))));
    }
    await Promise.all(pending);
    const summary = { ...summarizeLoad(counts), intervalMs: config.intervalMs, durationMs: config.durationMs, ackTimeoutMs: config.ackTimeoutMs, aborted };
    console.log(JSON.stringify(summary, null, 2));
    if (summary.failed || aborted) throw new Error('GPS load gate failed; see non-secret summary');
    return summary;
  } finally {
    for (const socket of sockets) socket.disconnect();
    process.off('SIGINT', abort); process.off('SIGTERM', abort);
  }
}

export async function loadFromEnvironment() {
  return runGpsLoad({
    baseUrl: process.env.LOAD_TEST_BASE_URL || '', email: process.env.LOAD_TEST_DRIVER_EMAIL || '',
    password: process.env.LOAD_TEST_DRIVER_PASSWORD || '', vehicleId: process.env.LOAD_TEST_VEHICLE_ID || '', journeyId: process.env.LOAD_TEST_JOURNEY_ID || '',
    clients: integerSetting(process.env.LOAD_TEST_CLIENTS, 500, 1, 5000, 'LOAD_TEST_CLIENTS'),
    intervalMs: integerSetting(process.env.LOAD_TEST_INTERVAL_MS, 3000, 1000, 60_000, 'LOAD_TEST_INTERVAL_MS'),
    durationMs: integerSetting(process.env.LOAD_TEST_DURATION_MS, 60_000, 10_000, 3_600_000, 'LOAD_TEST_DURATION_MS'),
    ackTimeoutMs: integerSetting(process.env.LOAD_TEST_ACK_TIMEOUT_MS, 10_000, 100, 60_000, 'LOAD_TEST_ACK_TIMEOUT_MS'),
    confirmStaging: process.env.LOAD_TEST_CONFIRM_STAGING === 'YES'
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await loadFromEnvironment().catch(error => { console.error('[load] ' + (error instanceof Error ? error.message : 'failed')); process.exitCode = 1; });
}
