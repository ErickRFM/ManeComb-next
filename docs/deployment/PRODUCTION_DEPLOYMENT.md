# ManeComb Next — Production Deployment Runbook

## Objetivo

Este runbook prepara ManeComb Next para desplegarse como una plataforma persistente de Node/Next.js en Render, manteniendo Socket.IO, Redis/BullMQ y el wrapper Android Kotlin/Capacitor.

La topología de producción es:

```text
Cloudflare DNS / dominio
        |
        v
Render Web: manecomb-next
  Next.js + custom Node server + Socket.IO
        |
        +------ MongoDB Atlas
        |
        +------ Render Key Value: manecomb-next-redis
        |             |
        |             +-- Socket.IO adapter
        |             +-- rate limiting
        |             +-- PTT floor locks
        |             +-- BullMQ
        |
        +------ Render Worker: manecomb-next-communication-worker
                      |
                      +-- Outbox -> Resend / Web Push
```

Do not deploy the web surface as a static Cloudflare Pages app. ManeComb requires a persistent Node process for Socket.IO and realtime signaling. Cloudflare can remain in front as DNS/proxy.

## Deployment gates

A production deploy is allowed only when:

1. GitHub `CI` is green.
2. GitHub `UX QA` is green.
3. `npm run deploy:check` passes with production values.
4. Render `/api/health/ready` returns HTTP 200.
5. Android smoke produces an installable APK and opens Driver UI in the emulator.
6. Production credentials have been tested in staging.

The prepared Blueprint uses `autoDeployTrigger: "off"` on web and worker. Keep Blueprint Auto Sync disabled as well. An initial Blueprint sync provisions and deploys resources even when auto-deploy is off: do not sync it before the user's release gates are met. Existing services and productive environment variables are outside this preparation's scope.

## Render Blueprint

`render.yaml` defines three isolated resources:

- `manecomb-next`: Docker web service.
- `manecomb-next-communication-worker`: Docker background worker.
- `manecomb-next-redis`: dedicated Render Key Value.

All three are kept in the same Render region to use the private Redis connection.

### Redis isolation

Do not point ManeComb Next at the Redis used by the legacy ManeComb deployment unless it is a temporary migration measure.

ManeComb Next also uses:

```text
REDIS_NAMESPACE=manecomb-next-prod
```

This isolates:

- Socket.IO Redis Adapter channels.
- BullMQ communication jobs.
- HTTP rate-limit keys.
- Radio/PTT floor locks.

A dedicated Redis remains the preferred production topology.

## Required web environment

| Variable | Requirement |
| --- | --- |
| `NODE_ENV` | `production` |
| `APP_URL` | Final HTTPS origin, e.g. `https://manecomb.com` |
| `AUTH_SECRET` | Generated secret, >= 32 chars |
| `MFA_ENCRYPTION_KEY` | Generated secret, >= 32 chars |
| `MONGODB_URI` | Production Atlas database URI |
| `REDIS_URL` | Provided by `manecomb-next-redis` |
| `REDIS_NAMESPACE` | `manecomb-next-prod` |
| `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` | Public Mapbox token |
| `RESEND_API_KEY` | Production Resend key |
| `EMAIL_FROM` | Verified ManeComb sender |
| `MERCADO_PAGO_WEBHOOK_SECRET` | Production webhook secret |
| `MERCADOPAGO_ACCESS_TOKEN` | Production access token |
| `NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY` | VAPID public key |
| `WEB_PUSH_VAPID_PRIVATE_KEY` | Matching VAPID private key |
| `WEB_PUSH_SUBJECT` | Support mailto URI |
| `CLOUDINARY_CLOUD_NAME` | Production cloud |
| `CLOUDINARY_API_KEY` | Production key |
| `CLOUDINARY_API_SECRET` | Production secret |
| `RTC_STUN_URLS` | STUN URLs |
| `RTC_TURN_URLS` | TURN URLs |
| `RTC_TURN_SECRET` | Preferred dynamic TURN secret |
| `RTC_TURN_USERNAME/CREDENTIAL` | Alternative static TURN credentials |

The worker needs MongoDB, Redis, namespace, Resend and Web Push credentials.

## Build-time public variables

Next.js inlines `NEXT_PUBLIC_*` values into client bundles during `next build`.

The Dockerfile therefore explicitly declares only the two non-secret public build arguments:

- `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`
- `NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY`

Never add private keys, JWT secrets, Mongo credentials, Mercado Pago credentials, Cloudinary secret or TURN secret as Docker `ARG`.

## Mercado Pago

Production webhook URL:

```text
https://<APP_URL_HOST>/api/webhooks/mercadopago
```

After configuration:

1. Send a Mercado Pago test notification.
2. Verify HTTP 200 for a valid signed event.
3. Verify invalid signatures return 401.
4. Create a test subscription.
5. Confirm `Subscription.planCode/status/vehicleLimit` reconcile from provider truth.
6. Repeat the same webhook and verify idempotent reuse.

## MongoDB cutover

Do not let the legacy ManeComb worker and ManeComb Next worker mutate the same Outbox collections during an uncontrolled overlap.

Recommended migration sequence:

1. Create a staging database for ManeComb Next.
2. Run schema/data migration or controlled import.
3. Validate multitenancy and counts.
4. Freeze writes on the legacy system for final cutover.
5. Copy the final delta.
6. Start ManeComb Next web + worker.
7. Validate readiness and smoke flows.
8. Move traffic/DNS.
9. Keep legacy service available for rollback but with writes disabled.

## Domain / Cloudflare

Recommended first deployment:

```text
staging.manecomb.com -> Render manecomb-next staging/production candidate
```

After end-to-end validation:

```text
manecomb.com -> Render manecomb-next
```

Cloudflare may proxy the hostname, but the origin remains the Render web service. Confirm WebSocket traffic to `/socket.io` works through the chosen Cloudflare settings.

Set `APP_URL` to the exact externally visible HTTPS origin.

## Verification after deploy

Run:

```bash
curl -fsS https://<host>/api/health/live
curl -fsS https://<host>/api/health/ready
```

Expected:

- `/live`: HTTP 200 when the Node process is alive.
- `/ready`: HTTP 200 only when Mongo, Redis and every required production integration are configured.

Then verify:

- login / logout;
- MFA platform admin;
- registration + email;
- subscription checkout;
- Mercado Pago webhook;
- company RBAC;
- vehicle creation and plan limit;
- route editor;
- driver activation;
- journey lifecycle;
- GPS live + stale/lost;
- chat;
- PTT;
- WebRTC via TURN;
- SOS;
- document upload/download/review;
- Web Push;
- communication worker delivery.

## Android

Production Android is built from the reproducible wrapper:

```bash
npm ci
npm run native:prepare
cd android
./gradlew assembleRelease
```

The CI smoke matrix uses JDK 21 and builds a real debug APK, installs it in Android API 33–36 emulators (Android 13–16), opens the Driver fixture and stores portrait/landscape screenshots. This checks build/install/start; it does not certify physical GPS, audio, camera, Doze or Web Push delivery. Android 16 tooling is described in the [official SDK setup](https://developer.android.com/about/versions/16/setup-sdk).

A production release still requires:

- final signing keystore configuration;
- final versionCode/versionName;
- production `CAPACITOR_SERVER_URL` or packaged production strategy;
- physical-device test with screen locked/Doze;
- 8–12 hour route test;
- offline queue/backfill verification.

## Rollback

If web deployment fails after cutover:

1. Restore previous DNS/origin or Render deployment.
2. Stop the new communication worker if its schema is incompatible with the legacy worker.
3. Preserve Mongo and Redis data for investigation; do not purge queues blindly.
4. Review audit/outbox/webhook idempotency before replaying events.
5. Re-run CI + readiness before another cutover.

## Final commands

Repository gates:

```bash
npm ci
npm audit --omit=dev --audit-level=high
npm run typecheck
npm test
npm run test:integration
npm run build
npm run deploy:check
```

Android:

```bash
npm run native:prepare
cd android
./gradlew assembleDebug
```

Production deployment should not proceed if any gate above is red.
