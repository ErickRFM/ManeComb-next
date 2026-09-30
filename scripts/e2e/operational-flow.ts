import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose, { type Connection } from 'mongoose';
import { io, type Socket } from 'socket.io-client';
import { SignJWT } from 'jose';
import { assertLoadTarget, integerSetting, runGpsLoad } from '../load/socket-gps';

type Options = { method?: string; token?: string; body?: unknown };
const TIMEOUT_MS = 20_000;

function check(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}
function id(value: unknown, label: string) {
  check(typeof value === 'string' && /^[a-f0-9]{24}$/i.test(value), label + ' missing valid Mongo ID');
  return value;
}
function cookieToken(response: Response) {
  const match = (response.headers.get('set-cookie') || '').match(/manecomb_session=([^;]+)/);
  check(match, 'Expected session cookie');
  return decodeURIComponent(match[1]);
}

export async function runOperationalFlow() {
  const baseUrl = assertLoadTarget(process.env.E2E_BASE_URL || '', process.env.E2E_CONFIRM_STAGING === 'YES');
  const localFixture = process.env.E2E_LOCAL_QA_DATABASE;
  const remoteFixture = process.env.E2E_FIXTURE_MODE === 'isolated-active-tenant';
  check(localFixture || (remoteFixture && process.env.E2E_CONFIRM_STAGING === 'YES' && process.env.E2E_ISOLATED_PROVIDERS === 'YES'),
    'Use the local QA wrapper, or explicitly configure an isolated active staging tenant with disabled external providers');
  if (!localFixture) check(process.env.E2E_OWNER_EMAIL && process.env.E2E_OWNER_PASSWORD, 'Staging fixture requires E2E_OWNER_EMAIL and E2E_OWNER_PASSWORD');
  const sockets = new Set<Socket>();
  let fixture: Connection | undefined;
  const abortController = new AbortController();
  const abort = () => { abortController.abort(); for (const socket of sockets) socket.disconnect(); };
  process.once('SIGINT', abort); process.once('SIGTERM', abort);

  const request = async (path: string, options: Options = {}) => {
    const headers: Record<string, string> = {};
    if (options.body !== undefined) headers['content-type'] = 'application/json';
    if (options.token?.startsWith('mcdev_')) headers.authorization='Bearer '+options.token;
    else if (options.token) headers.cookie = 'manecomb_session=' + encodeURIComponent(options.token);
    if (options.body !== undefined) { headers.origin = baseUrl; headers['sec-fetch-site'] = 'same-origin'; }
    const response = await fetch(baseUrl + path, {
      method: options.method || 'GET', headers, redirect: 'error',
      signal: AbortSignal.any([abortController.signal, AbortSignal.timeout(TIMEOUT_MS)]),
      body: options.body === undefined ? undefined : JSON.stringify(options.body)
    });
    const data = await response.json().catch(() => ({})) as any;
    check(response.ok, (options.method || 'GET') + ' ' + path + ' failed with HTTP ' + response.status);
    return { response, data };
  };
  const connect = (token: string) => new Promise<Socket>((accept, reject) => {
    const socket = io(baseUrl, { path: '/socket.io', transports: ['websocket'], auth: { token }, forceNew: true, reconnection: false, timeout: TIMEOUT_MS });
    sockets.add(socket);
    const timer = setTimeout(() => finish(false), TIMEOUT_MS);
    const finish = (ok: boolean) => {
      clearTimeout(timer); socket.off('connect', onConnect); socket.off('connect_error', onError);
      if (ok) accept(socket);
      else { socket.disconnect(); reject(new Error('Socket connection failed')); }
    };
    const onConnect = () => finish(true);
    const onError = () => finish(false);
    socket.once('connect', onConnect); socket.once('connect_error', onError);
  });
  const ack = (socket: Socket, event: string, payload: unknown, expectedOk = true) => new Promise<any>((accept, reject) => {
    const timer = setTimeout(() => reject(new Error(event + ' acknowledgment timeout')), TIMEOUT_MS);
    socket.emit(event, payload, (answer: any) => {
      clearTimeout(timer);
      if (answer?.ok === expectedOk) accept(answer);
      else reject(new Error(event + ' unexpected acknowledgment'));
    });
  });
  const delivery = (socket: Socket, event: string, predicate: (data: any) => boolean) => {
    let listener: (data: any) => void;
    let timer: ReturnType<typeof setTimeout>;
    const cancel = () => { clearTimeout(timer); socket.off(event, listener); };
    const promise = new Promise<any>((accept, reject) => {
      listener = data => { if (predicate(data)) { cancel(); accept(data); } };
      timer = setTimeout(() => { cancel(); reject(new Error(event + ' peer delivery timeout')); }, TIMEOUT_MS);
      socket.on(event, listener);
    });
    return { promise, cancel };
  };
  const verifyDelivery = async (receiver: Socket, event: string, predicate: (data: any) => boolean, trigger: () => Promise<unknown>) => {
    const waiting = delivery(receiver, event, predicate);
    try { return (await Promise.all([waiting.promise, trigger()]))[0]; }
    finally { waiting.cancel(); }
  };

  try {
    if (localFixture) {
      check(/^manecomb_qa_[a-f0-9]{20}$/.test(localFixture), 'Invalid local QA database name');
      check(['localhost', '127.0.0.1', '[::1]'].includes(new URL(baseUrl).hostname), 'Local QA fixture requires a loopback app');
      const uri = process.env.E2E_LOCAL_QA_URI || '';
      const match = uri.match(/^(mongodb(?:\+srv)?:\/\/[^/]+)\/([^?]+)(\?.*)?$/);
      check(match?.[2] === localFixture, 'Local QA URI must target the owned database exactly');
      try { fixture = await mongoose.createConnection(uri, { serverSelectionTimeoutMS: 15_000 }).asPromise(); }
      catch { throw new Error('Could not connect to owned local QA database'); }
      check(fixture.db?.databaseName === localFixture, 'Resolved QA database mismatch');
      const marker = await fixture.db.collection('__manecomb_qa_owner').findOne({ token: process.env.E2E_LOCAL_QA_OWNER });
      check(marker && marker.baseUrl === baseUrl, 'Missing matching QA database ownership marker');
    }

    const stamp = randomUUID().replaceAll('-', '').slice(0, 16);
    const ownerEmail = localFixture ? 'owner-e2e-' + stamp + '@example.invalid' : process.env.E2E_OWNER_EMAIL!;
    const ownerPassword = localFixture ? 'ManeComb-E2E-' + randomUUID() + '!' : process.env.E2E_OWNER_PASSWORD!;
    const driverEmail = 'driver-e2e-' + stamp + '@example.invalid';
    const driverPassword = 'Driver-' + stamp + '!';
    let ownerToken: string;
    let organizationId: string;
    if (fixture?.db) {
      console.log('[e2e] register isolated organization and seed owned QA trial');
      const registration = await request('/api/auth/register', { method: 'POST', body: { organizationName: 'ManeComb E2E ' + stamp, name: 'E2E Owner', email: ownerEmail, password: ownerPassword } });
      ownerToken = cookieToken(registration.response);
      organizationId = id(registration.data.organizationId, 'registration');
      const organizationObjectId = new mongoose.Types.ObjectId(organizationId);
      check(await fixture.db.collection('organizations').findOne({ _id: organizationObjectId }), 'App did not register into owned QA database');
      await fixture.db.collection('subscriptions').insertOne({
        organizationId: organizationObjectId, planCode: 'fleet-2', status: 'trial', provider: 'manual', vehicleLimit: 2,
        currentPeriodEnd: new Date(Date.now() + 60 * 60 * 1000), createdAt: new Date(), updatedAt: new Date()
      });
      await fixture.db.collection('organizations').updateOne({ _id: organizationObjectId }, { $set: { planCode: 'fleet-2' } });
    } else {
      console.log('[e2e] login to explicitly configured isolated active staging tenant');
      const ownerLogin = await request('/api/auth/login', { method: 'POST', body: { email: ownerEmail, password: ownerPassword } });
      check(ownerLogin.data.user?.channel === 'company_portal' && !ownerLogin.data.mfaRequired, 'Staging fixture must be a company portal account');
      ownerToken = cookieToken(ownerLogin.response);
      organizationId = id(ownerLogin.data.user.organizationId, 'staging organization');
    }

    console.log('[e2e] create vehicle, route, driver and activation');
    const vehicleResponse = await request('/api/vehicles', { method: 'POST', token: ownerToken, body: { economicNumber: 'E2E-' + stamp, plates: 'E2E123', capacity: 18 } });
    const vehicleId = id(vehicleResponse.data.vehicle?._id, 'vehicle');
    const routeResponse = await request('/api/routes', { method: 'POST', token: ownerToken, body: {
      name: 'Ruta E2E ' + stamp, origin: 'Inicio', destination: 'Fin', geometry: [
        { latitude: 19.3139, longitude: -98.2404 }, { latitude: 19.318, longitude: -98.235 }
      ], stops: [], status: 'active'
    } });
    const routeId = id(routeResponse.data.route?._id, 'route');
    const driverResponse = await request('/api/drivers', { method: 'POST', token: ownerToken, body: { name: 'E2E Driver', email: driverEmail, pin: driverPassword } });
    const driverId = id(driverResponse.data.driver?.id, 'driver');
    const key = await request('/api/activation-keys', { method: 'POST', token: ownerToken, body: { driverId, vehicleId, ttlHours: 1 } });
    check(key.data.code, 'Activation key missing');
    const activation = await request('/api/auth/activate', { method: 'POST', body: { code: key.data.code } });
    check(activation.data.user?.id === driverId && activation.data.user?.organizationId === organizationId, 'Activation identity mismatch');
    const driverToken = cookieToken(activation.response);

    console.log('[e2e] assign, ready and start journey');
    const assignment = await request('/api/journeys', { method: 'PUT', token: ownerToken, body: { vehicleId, driverId, routeId } });
    const journeyId = id(assignment.data.journey?._id, 'journey');
    await request('/api/journeys', { method: 'POST', token: driverToken, body: {
      journeyId, action: 'ready', checklist: { brakes: true, tires: true, lights: true, fuel: true, cleanliness: true, odometerStartKm: 1000 }
    } });
    const started = await request('/api/journeys', { method: 'POST', token: driverToken, body: { journeyId, action: 'start' } });
    check(started.data.journey?.state === 'RUNNING', 'Journey did not reach RUNNING');
    const issued=await request('/api/auth/device-session',{method:'POST',token:driverToken,body:{vehicleId,journeyId}});
    const deviceToken=String(issued.data.token||'');
    check(deviceToken.startsWith('mcdev_'),'Device telemetry session was not issued');
    for(const path of ['/api/vehicles','/api/chat/messages','/api/account/subscription','/api/admin/audit']){
      const denied=await fetch(baseUrl+path,{headers:{authorization:'Bearer '+deviceToken},signal:AbortSignal.timeout(TIMEOUT_MS)});
      check(denied.status===401||denied.status===403,'Device telemetry token accessed '+path);
    }
    check(await connect(deviceToken).then(()=>false,()=>true),'Device token accessed chat/radio realtime');

    console.log('[e2e] verify GPS packet replay and old-point ordering');
    const first = { packetId: randomUUID(), vehicleId, journeyId, latitude: 19.3139, longitude: -98.2404, speedMps: 7, heading: 90, accuracy: 6, recordedAt: new Date(Date.now() - 5000).toISOString() };
    const second = { ...first, packetId: randomUUID(), latitude: 19.314, recordedAt: new Date().toISOString() };
    for (const packet of [first, second, first]) {
      const result = await request('/api/locations/telemetry', { method: 'POST', token: deviceToken, body: packet });
      check(result.data.packetId === packet.packetId, 'Telemetry packet acknowledgment mismatch');
    }
    const live = await request('/api/locations/live', { token: ownerToken });
    const unit = (live.data.units || []).find((item: any) => item.vehicleId === vehicleId);
    check(unit && unit.recordedAt === second.recordedAt && unit.latitude === second.latitude && unit.freshness === 'live', 'Live GPS regressed after replaying an older packet');
    if (fixture?.db) {
      for (const packetId of [first.packetId, second.packetId]) {
        const count = await fixture.db.collection('routesessionpositions').countDocuments({ organizationId: new mongoose.Types.ObjectId(organizationId), packetId });
        check(count === 1, 'GPS packet persisted ' + count + ' times instead of once');
      }
    }

    console.log('[e2e] verify peer chat delivery, history and idempotency');
    const [driverSocket, ownerSocket] = await Promise.all([connect(driverToken), connect(ownerToken)]);
    await Promise.all([ack(driverSocket, 'chat:join', { channelId: 'dispatch' }), ack(ownerSocket, 'chat:join', { channelId: 'dispatch' })]);
    const chat = { channelId: 'dispatch', clientMessageId: 'e2e-' + stamp, kind: 'text', body: 'Mensaje E2E ' + stamp };
    const message = await verifyDelivery(ownerSocket, 'chat:message', data => data.clientMessageId === chat.clientMessageId, () => ack(driverSocket, 'chat:message', chat));
    const duplicate = await ack(driverSocket, 'chat:message', chat);
    check(String(duplicate.message?._id) === String(message._id), 'Chat retry produced a different message');
    const history = await request('/api/chat/messages?channelId=dispatch&limit=50', { token: ownerToken });
    check(history.data.messages?.filter((item: any) => item.clientMessageId === chat.clientMessageId).length === 1, 'Chat history is missing or duplicates the sent message');

    console.log('[e2e] verify PTT floor contention, audio delivery and release');
    const channelId = 'e2e:' + stamp;
    await ack(ownerSocket, 'radio:join', { channelId });
    await verifyDelivery(ownerSocket, 'radio:floor', data => data.channelId === channelId && data.active === true, () => ack(driverSocket, 'radio:request-floor', { channelId }));
    const busy = await ack(ownerSocket, 'radio:request-floor', { channelId }, false);
    check(busy.reason === 'busy', 'PTT contention did not report busy');
    const chunk = 'data:audio/webm;base64,AAAA';
    await verifyDelivery(ownerSocket, 'radio:audio', data => data.channelId === channelId && data.chunk === chunk && data.userId === driverId,
      async () => { driverSocket.emit('radio:audio', { channelId, chunk }); });
    await verifyDelivery(ownerSocket, 'radio:floor', data => data.channelId === channelId && data.active === false, () => ack(driverSocket, 'radio:release-floor', { channelId }));
    await ack(ownerSocket, 'radio:request-floor', { channelId });
    await ack(ownerSocket, 'radio:release-floor', { channelId });

    console.log('[e2e] verify SOS in portal and realtime');
    const incident = await verifyDelivery(ownerSocket, 'incident:new', data => data.message === 'SOS E2E ' + stamp, async () => {
      await request('/api/incidents', { method: 'POST', token: driverToken, body: { vehicleId, type: 'sos', message: 'SOS E2E ' + stamp, latitude: second.latitude, longitude: second.longitude } });
    });
    const incidentId = id(incident._id, 'incident');
    const incidents = await request('/api/incidents', { token: ownerToken });
    check(incidents.data.incidents?.some((item: any) => item._id === incidentId && item.type === 'sos'), 'SOS not visible in portal');

    let load;
    if (process.env.E2E_RUN_LOAD === 'YES') {
      let metricsToken:string|undefined;
      if(fixture?.db){
        // Synthetic MFA-verified identity exists only in the marker-owned QA DB.
        // This does not validate administrator MFA setup or real authentication.
        const adminId=new mongoose.Types.ObjectId();const jti=randomUUID();
        await fixture.db.collection('users').insertOne({_id:adminId,name:'QA metrics',email:'metrics-'+stamp+'@example.invalid',active:true,roles:['admin'],channel:'platform_admin',organizationId:null});
        await fixture.db.collection('sessions').insertOne({jti,userId:adminId,revokedAt:null,expiresAt:new Date(Date.now()+3600_000)});
        metricsToken=await new SignJWT({organizationId:null,roles:['admin'],channel:'platform_admin',jti,mfaVerified:true}).setProtectedHeader({alg:'HS256'}).setSubject(String(adminId)).setIssuedAt().setExpirationTime('1h').sign(new TextEncoder().encode(process.env.AUTH_SECRET));
        // Compile the diagnostic endpoint before applying load.
        await request('/api/admin/metrics',{token:metricsToken});
      }
      console.log('[e2e] execute GPS load while journey is RUNNING');
      try{load = await runGpsLoad({ baseUrl, email: driverEmail, password: driverPassword, vehicleId, journeyId,
        clients: integerSetting(process.env.LOAD_TEST_CLIENTS, 500, 1, 5000, 'LOAD_TEST_CLIENTS'),
        intervalMs: integerSetting(process.env.LOAD_TEST_INTERVAL_MS, 3000, 1000, 60_000, 'LOAD_TEST_INTERVAL_MS'),
        durationMs: integerSetting(process.env.LOAD_TEST_DURATION_MS, 60_000, 10_000, 3_600_000, 'LOAD_TEST_DURATION_MS'),
        ackTimeoutMs: integerSetting(process.env.LOAD_TEST_ACK_TIMEOUT_MS, 10_000, 100, 60_000, 'LOAD_TEST_ACK_TIMEOUT_MS'),
        confirmStaging: process.env.E2E_CONFIRM_STAGING === 'YES'
      })}finally{
        if(metricsToken)try{
          const diagnostics=await request('/api/admin/metrics',{token:metricsToken});
          console.log('[load-metrics] '+JSON.stringify(diagnostics.data.metrics));
        }catch{console.log('[load-metrics] diagnostic request timed out or failed')}
      }
    }

    console.log('[e2e] finish journey and verify driver login');
    await request('/api/journeys', { method: 'POST', token: driverToken, body: { journeyId, action: 'finish', finalOdometerKm: 1005 } });
    const revoked=await fetch(baseUrl+'/api/locations/telemetry',{method:'POST',headers:{authorization:'Bearer '+deviceToken,'content-type':'application/json'},body:JSON.stringify({...second,packetId:randomUUID()}),signal:AbortSignal.timeout(TIMEOUT_MS)});
    check(revoked.status===401,'Finished journey retained an active device token');
    const journeys = await request('/api/journeys', { token: ownerToken });
    check(journeys.data.journeys?.some((item: any) => item._id === journeyId && item.state === 'FINISHED'), 'Journey did not reach FINISHED');
    const login = await request('/api/auth/login', { method: 'POST', body: { email: driverEmail, password: driverPassword } });
    check(login.data.user?.id === driverId && login.data.user?.channel === 'mobile_operations' && !login.data.mfaRequired, 'Driver login identity mismatch');
    cookieToken(login.response);
    const summary = { ok: true, organizationId, vehicleId, routeId, driverId, journeyId, incidentId, packetDedupStorage: fixture ? 'verified' : 'pending: remote DB not inspected', registration: fixture ? 'verified' : 'pending: existing staging tenant', liveFreshness: unit.freshness, load };
    console.log(JSON.stringify(summary, null, 2));
    return summary;
  } finally {
    for (const socket of sockets) socket.disconnect();
    if (fixture) await fixture.close();
    process.off('SIGINT', abort); process.off('SIGTERM', abort);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await runOperationalFlow().catch(error => { console.error('[e2e] ' + (error instanceof Error ? error.message : 'failed')); process.exitCode = 1; });
}
