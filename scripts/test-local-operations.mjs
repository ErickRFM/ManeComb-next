import { randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createServer } from 'node:net';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import Redis from 'ioredis';

// Invoke with node --env-file=.env.local; credentials are never printed or rewritten.
const root = fileURLToPath(new URL('../', import.meta.url));
const productionMode=process.argv.includes('--production');
if(productionMode&&!existsSync(new URL('../.next/BUILD_ID',import.meta.url)))throw new Error('Build the current source before production-mode QA');
const source = process.env.MONGODB_URI?.match(/^(mongodb(?:\+srv)?:\/\/[^/]+)(?:\/([^?]*))?(\?.*)?$/);
if (!source) throw new Error('Local operations QA requires MONGODB_URI loaded by Node --env-file');
const runId = randomBytes(10).toString('hex');
const database = 'manecomb_qa_' + runId;
const namespace = 'qa_' + runId;
const owner = randomBytes(32).toString('hex');
const options = new URLSearchParams((source[3] || '').replace(/^\?/, ''));
// Preserve the original authentication database when Mongo defaults authSource to the URI database.
if (source[1].includes('@') && !options.has('authSource')) options.set('authSource', source[2] || 'admin');
const uri = source[1] + '/' + database + (options.size ? '?' + options.toString() : '');
const redisEnabled = true;
if (redisEnabled && (!existsSync(new URL('../src/lib/runtime-namespace.ts', import.meta.url)) || !process.env.REDIS_URL)) {
  throw new Error('Operational QA requires Redis configuration and runtime namespace isolation');
}
const port = await new Promise((accept, reject) => {
  const probe = createServer();
  probe.once('error', reject);
  probe.listen(0, '127.0.0.1', () => {
    const address = probe.address();
    const selected = typeof address === 'object' && address ? address.port : 0;
    probe.close(error => error ? reject(error) : accept(selected));
  });
});
const baseUrl = 'http://127.0.0.1:' + port;
const qaEnv = {
  ...process.env, NODE_ENV: productionMode?'production':'development', NEXT_TELEMETRY_DISABLED: '1', HOSTNAME: '127.0.0.1', PORT: String(port),
  APP_URL: baseUrl, MONGODB_URI: uri, REDIS_URL: redisEnabled ? process.env.REDIS_URL : '', REDIS_NAMESPACE: namespace,
  AUTH_SECRET: randomBytes(32).toString('hex'), MFA_ENCRYPTION_KEY: randomBytes(32).toString('hex'),
  E2E_BASE_URL: baseUrl, E2E_LOCAL_QA_DATABASE: database, E2E_LOCAL_QA_URI: uri, E2E_LOCAL_QA_OWNER: owner,
  E2E_RUN_LOAD: process.argv.includes('--load') ? 'YES' : '', E2E_FIXTURE_MODE: '',
  E2E_OWNER_EMAIL: '', E2E_OWNER_PASSWORD: '', E2E_CONFIRM_STAGING: '',
  RESEND_API_KEY: '', EMAIL_FROM: 'ManeComb QA <qa@example.invalid>',
  MERCADOPAGO_ACCESS_TOKEN: '', MERCADO_PAGO_WEBHOOK_SECRET: '',
  NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY: '', WEB_PUSH_VAPID_PRIVATE_KEY: '', WEB_PUSH_SUBJECT: '',
  CLOUDINARY_CLOUD_NAME: '', CLOUDINARY_API_KEY: '', CLOUDINARY_API_SECRET: '',
  NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN: '', RTC_STUN_URLS: '', RTC_TURN_URLS: '', RTC_TURN_USERNAME: '', RTC_TURN_CREDENTIAL: '', RTC_TURN_SECRET: '',
  PLATFORM_ADMIN_EMAIL: '', PLATFORM_ADMIN_PASSWORD: ''
};
const children = new Set();
let fixture;
let redis;
let mongoOwned = false;
let redisOwned = false;
let interrupted = false;
let result = 1;
const interruptedSignal = () => { interrupted = true; for (const child of children) child.kill('SIGTERM'); };
process.once('SIGINT', interruptedSignal); process.once('SIGTERM', interruptedSignal);

const start = (script, stdio) => {
  const child = spawn(process.execPath, ['--import', 'tsx', fileURLToPath(new URL(script, import.meta.url))], { cwd: root, env: qaEnv, stdio, windowsHide: true });
  children.add(child);
  return child;
};
const stop = async child => {
  if (child.exitCode !== null || child.signalCode !== null) return;
  await new Promise(accept => {
    const timer = setTimeout(() => child.kill('SIGKILL'), 5000);
    child.once('close', () => { clearTimeout(timer); accept(); });
    child.kill('SIGTERM');
  });
};

try {
  try { fixture = await mongoose.createConnection(uri, { serverSelectionTimeoutMS: 15_000 }).asPromise(); }
  catch { throw new Error('Could not connect to temporary Mongo database; verify local credentials and network access'); }
  if (fixture.db?.databaseName !== database || !/^manecomb_qa_[a-f0-9]{20}$/.test(database)) throw new Error('Refusing unverified QA database');
  const collections = await fixture.db.listCollections({}, { nameOnly: true }).toArray();
  if (collections.length) throw new Error('Refusing a QA database that already contains collections');
  await fixture.db.collection('__manecomb_qa_owner').insertOne({ token: owner, baseUrl, createdAt: new Date() });
  mongoOwned = true;
  if (redisEnabled) {
    redis = new Redis(process.env.REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 1, connectTimeout: 15_000 });
    // Redis errors can contain connection metadata; report a generic failure below.
    redis.on('error', () => {});
    try {
      await redis.connect();
      let cursor = '0';
      do {
        const [next, existing] = await redis.scan(cursor, 'MATCH', namespace + ':*', 'COUNT', 100);
        if (existing.length) throw new Error('Namespace not empty');
        cursor = next;
      } while (cursor !== '0');
      if (await redis.set(namespace + ':qa-owner', owner, 'EX', 7200, 'NX') !== 'OK') throw new Error('Namespace not empty');
      redisOwned = true;
    } catch { throw new Error('Could not reserve isolated QA Redis namespace'); }
  }
  console.log('[local-qa] '+(productionMode?'production build':'development')+'; ' + database + '; Redis ' + (redisEnabled ? 'isolated namespace ' + namespace : 'disabled (development fallback)'));
  // No worker runs. Outbox email/push payloads remain inside the owned Mongo database.
  const server = start('../server.ts', ['ignore', 'pipe', 'pipe']);
  let serverError = false;
  server.on('error', () => { serverError = true; });
  // Drain output without printing loaded connection metadata or secrets on compiler failures.
  server.stdout.on('data', () => {}); server.stderr.on('data', () => {});
  const deadline = Date.now() + 180_000;
  let ready = false;
  while (!ready && !interrupted && !serverError && server.exitCode === null && server.signalCode === null && Date.now() < deadline) {
    try {
      const response = await fetch(baseUrl + '/api/health/live', { redirect: 'error', signal: AbortSignal.timeout(5000) });
      ready = response.ok && (await response.json()).status === 'ok';
    } catch { /* Server may still be starting or compiling the first route. */ }
    if (!ready) await new Promise(accept => setTimeout(accept, 500));
  }
  if (!ready || interrupted) throw new Error('Isolated QA server failed to become ready or was interrupted');
  const runner = start('./e2e/operational-flow.ts', 'inherit');
  result = await new Promise(accept => {
    runner.once('error', () => accept(1));
    runner.once('close', code => accept(code ?? 1));
  });
} catch (error) {
  // Only wrapper-generated messages leave this process; raw driver errors may contain URI credentials.
  console.error('[local-qa] ' + (error instanceof Error && !/mongodb|redis:\/\//i.test(error.message) ? error.message : 'QA infrastructure or cleanup failed'));
} finally {
  for (const child of children) await stop(child);
  if (fixture?.db && mongoOwned) {
    try {
      const marker = await fixture.db.collection('__manecomb_qa_owner').findOne({ token: owner, baseUrl });
      if (fixture.db.databaseName !== database || !/^manecomb_qa_[a-f0-9]{20}$/.test(database) || !marker) throw new Error('QA database ownership changed');
      await fixture.db.dropDatabase();
      console.log('[local-qa] removed owned Mongo database ' + database);
    } catch { result = 1; console.error('[local-qa] Mongo cleanup refused or failed; owned QA database ' + database + ' may remain'); }
  }
  if (redis && redisOwned) {
    try {
      if (await redis.get(namespace + ':qa-owner') !== owner || !/^qa_[a-f0-9]{20}$/.test(namespace)) throw new Error('QA Redis ownership changed');
      let cursor = '0';
      const keys = new Set();
      do {
        const [next, batch] = await redis.scan(cursor, 'MATCH', namespace + ':*', 'COUNT', 100);
        cursor = next;
        for (const key of batch) { if (!key.startsWith(namespace + ':')) throw new Error('Unexpected Redis key'); keys.add(key); }
      } while (cursor !== '0');
      const ownKeys = [...keys];
      for (let start = 0; start < ownKeys.length; start += 100) await redis.del(...ownKeys.slice(start, start + 100));
      console.log('[local-qa] removed owned Redis namespace ' + namespace);
    } catch { result = 1; console.error('[local-qa] Redis cleanup refused or failed; namespace ' + namespace + ' may remain'); }
  }
  if (fixture) await fixture.close().catch(() => {});
  if (redis) redis.disconnect();
  process.off('SIGINT', interruptedSignal); process.off('SIGTERM', interruptedSignal);
}
process.exitCode = interrupted ? 1 : result;
