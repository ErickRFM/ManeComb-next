# Operational QA and release evidence

The runners port the operational certification coverage from PR #3 without bypassing production subscription checks. Code/tool availability is not evidence that a release has passed external gates.

## Isolated local E2E

From the repository root, with dependencies installed:

```powershell
node --env-file=.env.local scripts/test-local-operations.mjs
```

Node loads the existing environment file without rewriting it. The wrapper derives a fresh Mongo database named `manecomb_qa_<20 random hex digits>` from the configured Mongo authority, preserves authentication settings, and creates an ownership marker. It starts a child Next.js/Socket.IO server on a loopback port with fresh QA authentication keys and all live email/payment/push/Cloudinary/Mapbox/TURN credentials blanked. It starts no communication worker: outbox records stay in the QA database, and no emails or push messages are delivered. Real Redis is required and isolated by namespace for rate limiting and radio floor control.

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
| 2026-09-30 | Integration working tree after `344daad` | Windows Node 20, Atlas QA, real namespaced Redis | Flow through SOS; load gate FAIL | isolated `qa_*` | 500 / 60s, 3s interval | 0 errors received / 10000 ACK timeouts | none within 10s deadline | All 500 connected; capacity diagnosis required |
| 2026-09-30 | Same integration working tree | Same infrastructure; new QA fixtures | Full flow + device-token exclusion/revocation PASS | isolated `qa_*` | 1 / 10s, 3s interval | 0 / 0 | 377 / 458 / 458 ms | 4/4 ACKs; transport works at low load |

The single-client run isolates the initial 500-client failure from a total transport failure. It does not establish the bottleneck or production capacity. CI subsequently passed the compiled-server gate; the Atlas local target remains FAIL until equivalent staging infrastructure sustains it with complete ACKs and measured resource use. No timeout threshold was relaxed to obtain a pass.

### Production-mode benchmark

Run `npm run build` from the current source, then `node --env-file=.env.local scripts/test-local-operations.mjs --production --load`. All databases, Redis namespaces, credentials and cleanup remain isolated exactly as above. The app uses the compiled Next build rather than the development compiler. Live providers remain disabled and `/ready` may correctly report their missing configuration; this benchmark does not certify live integrations. CI builds first and uses the same production-mode runner against disposable Mongo replica-set/Redis services on Node 20 and 24. The 500 clients/3000 ms/60 s/10 s ACK thresholds remain unchanged.

Development capacity remains separate evidence: before fanout correction, CI Node 24 received 809/10.000 ACK; after grouping snapshots, Node 20 received 8.076/10.500 within the deadline. Map delivery is now capped at one latest canonical snapshot per tenant/vehicle/250 ms and reaches company monitor rooms plus the assigned driver's user room. Persistence and per-packet ACK are independent and retain every packet. Lean queries avoid creating writable Mongoose documents for read-only telemetry/subscription/route results. The runner rounds waits upward to limit timer truncation; scheduling at the duration boundary can still produce 20 or 21 batches. Report actual sent/ACK totals rather than assuming a fixed count.

| Date | Commit | Environment | E2E result | Redis mode | Clients / duration | ACK errors / missing | p50 / p95 / p99 | Resource notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 2026-09-30 | `baf523f` | CI Node 20, compiled server, disposable Mongo replica set | Full flow PASS | real isolated Redis | 500 / 60s, 3s interval | 0 / 0 (10000/10000 ACK) | 1509 / 1758 / 1908 ms | CPU 64.8%, RSS 699 MB, event loop p95 31.2 ms at end |
| 2026-09-30 | `baf523f` | CI Node 24, same isolation | Full flow PASS | real isolated Redis | 500 / 60s, 3s interval | 0 / 0 (10500/10500 ACK) | 761 / 998 / 1203 ms | CPU 21.6%, RSS 608 MB, event loop p95 22.5 ms at end |
| 2026-09-30 | `baf523f` | Windows Node 20, compiled server, Atlas QA | Through SOS; load FAIL | real isolated Redis | 500 / 60s, 3s interval | 0 received / 10000 missing | none within 10s | Metrics request timed out; owned Mongo/Redis fixtures removed; tier/cause unconfirmed |

Evidence: [CI run](https://github.com/ErickRFM/ManeComb-next/actions/runs/36699571127). CI is a transport/ingestion regression gate, not a Render/Atlas capacity certificate. Staging load remains a release blocker.
