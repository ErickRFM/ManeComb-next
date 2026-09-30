# Operational QA and release evidence

The runners port the operational certification coverage from PR #3 without bypassing production subscription checks. Code/tool availability is not evidence that a release has passed external gates.

## Isolated local E2E

From the repository root, with dependencies installed:

```powershell
node --env-file=.env.local scripts/test-local-operations.mjs
```

Node loads the existing environment file without rewriting it. The wrapper derives a fresh Mongo database named `manecomb_qa_<20 random hex digits>` from the configured Mongo authority, preserves authentication settings, and creates an ownership marker. It starts a child Next.js/Socket.IO server on a loopback port with fresh QA authentication keys and all live email/payment/push/Cloudinary/Mapbox/TURN credentials blanked. It starts no communication worker: outbox records stay in the QA database, and no emails or push messages are delivered. Redis is disabled by default; rate limiting and radio floor control use development fallback, which does not certify real Redis behavior.

After registration, only the marker-verified QA database receives a one-hour `fleet-2` trial fixture. The runner checks vehicle/route/driver creation, activation, assignment/checklist/start, HTTP GPS packet acknowledgment, duplicate packet storage, older packet ordering, peer chat delivery and retry persistence, PTT floor contention/audio delivery/release, SOS realtime and portal visibility, journey finish, and driver login. PTT checks transport delivery using a synthetic chunk; audible Opus playback is a separate device test.

Cleanup stops child processes before dropping Mongo. The wrapper requires the exact generated database name and unchanged ownership marker before dropping it. It never drops the original database. On a hard kill or infrastructure outage, cleanup may be incomplete; output identifies the generated QA database/namespace for a deliberate recovery. Never use a broad drop/flush command.

## Real Redis and 500 connection load

The runtime always requires real Redis and reserves a generated `qa_<20 hex digits>` namespace:

```powershell
node --env-file=.env.local scripts/test-local-operations.mjs --load
```

The wrapper reserves a Redis ownership key, preserves the configured Redis URL, and sets `REDIS_NAMESPACE` for the child app. Cleanup scans/deletes only keys beginning with its exact generated namespace and requires its ownership token. Socket.IO adapter pub/sub channels disappear when the child connections close. The wrapper never starts the real communication worker or touches another namespace.

`--load` runs after the peer/SOS checks while the newly created journey is still `RUNNING`, then finishes the journey. Default load is **500 simultaneous connections, one assigned driver and one vehicle, a unique `packetId` per socket/sample, every 3000 ms for 60 seconds**. This measures concurrent GPS ingestion and acknowledgments; it does not simulate 500 independent vehicles, mobile networks, or 500 map clients. A local machine is not production-equivalent capacity evidence.

Optional integer settings:

| Variable | Default | Range |
| --- | ---: | ---: |
| `LOAD_TEST_CLIENTS` | 500 | 1–5000 |
| `LOAD_TEST_INTERVAL_MS` | 3000 | 1000–60000 |
| `LOAD_TEST_DURATION_MS` | 60000 | 10000–3600000 |
| `LOAD_TEST_ACK_TIMEOUT_MS` | 10000 | 100–60000 |

The non-secret summary includes requested/connected clients, connection failures, sent/success/error/missing ACK counts, error percentage and p50/p95/p99/max latency. Latency percentiles cover received ACKs; missing ACKs appear separately and always fail the gate. Connection shortfall, no successful ACK, interruption, or total error rate above 1% also fails. Every pending ACK is bounded, and all sockets disconnect in `finally`.

## Explicit isolated staging fixtures

The remote E2E runner uses an **existing isolated active company tenant**, with sufficient spare vehicle capacity and disabled external providers/workers. It does not seed a remote subscription or delete remote data. Provision this fixture separately; records created by a run remain there for inspection and deliberate cleanup.

Configure `E2E_BASE_URL` (HTTPS), `E2E_CONFIRM_STAGING=YES`, `E2E_FIXTURE_MODE=isolated-active-tenant`, `E2E_ISOLATED_PROVIDERS=YES`, `E2E_OWNER_EMAIL`, and `E2E_OWNER_PASSWORD`, then run:

```powershell
node --import tsx scripts/e2e/operational-flow.ts
```

These flags assert that the staging server has been isolated by its operator; the runner cannot verify provider/worker deployment configuration. Remote mode checks the existing owner's login and all API/realtime flows, but reports new-company registration and direct database duplicate-storage verification as pending. It verifies replay packet acknowledgment and live ordering through the API. It never uses `MONGODB_URI` to mutate a remote subscription.

For load alone, configure `LOAD_TEST_BASE_URL`, `LOAD_TEST_CONFIRM_STAGING=YES` for remote HTTPS, `LOAD_TEST_DRIVER_EMAIL`, `LOAD_TEST_DRIVER_PASSWORD`, `LOAD_TEST_VEHICLE_ID`, and `LOAD_TEST_JOURNEY_ID` for an isolated assigned `RUNNING` fixture. Run `node --import tsx scripts/load/socket-gps.ts`. Confirm the intended target before executing. Origin URLs must have no credentials, path, query or fragment; loopback targets do not need remote confirmation.

## Release gates still requiring external evidence

- Production-equivalent 500+ connection load with resource/latency/error evidence and real namespaced Redis.
- Physical Android locked/background/battery testing, persistence across network loss, and logout/journey stop behavior.
- Live Cloudinary document/photo/receipt uploads, actual file constraints and protected downloads.
- Actual microphone/Opus playback, WebRTC/TURN connectivity and device permission checks.
- Live Mercado Pago, Resend, Web Push and platform-admin TOTP setup/verification.
- Green CI for the exact release commit.

Record timestamp, commit, environment, Redis mode, generated QA database/namespace, connected clients, interval/duration, ACK error/missing counts, latency percentiles and server resource notes. Save the operational IDs and exit status from the E2E summary. Never record passwords, session tokens, ownership tokens, API keys, TOTP secrets or URI credentials.

| Date | Commit | Environment | E2E result | Redis mode | Clients / duration | ACK errors / missing | p50 / p95 / p99 | Resource notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Pending | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Pending |
