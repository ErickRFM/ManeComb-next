# Validation log

Use this file only for non-secret production-readiness evidence. Never paste passwords, session cookies, API keys, TOTP secrets or VAPID private keys.

## CI

| Date | Commit | Typecheck | Unit tests | Build | Notes |
| --- | --- | --- | --- | --- | --- |
| Pending | Pending | Pending | Pending | Pending | Filled after the production-readiness PR runs |

## 500+ Socket.IO GPS load test

Command:

```bash
npm run test:load:gps
```

Required environment:

- `LOAD_TEST_BASE_URL`
- `LOAD_TEST_DRIVER_EMAIL`
- `LOAD_TEST_DRIVER_PASSWORD`
- `LOAD_TEST_VEHICLE_ID`
- optional `LOAD_TEST_JOURNEY_ID`
- optional `LOAD_TEST_CLIENTS` (default 500)
- optional `LOAD_TEST_INTERVAL_MS` (default 3000)
- optional `LOAD_TEST_DURATION_MS` (default 60000)

Record:

| Date | Environment | Clients | Interval | Duration | Ack error % | p50 | p95 | p99 | Max | Server notes |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Pending | staging | 500 | 3000 ms | 60 s+ | Pending | Pending | Pending | Pending | Pending | Pending |

## Operational E2E

Run only against localhost or an isolated staging tenant/database.

```bash
E2E_BASE_URL=https://staging.example.com E2E_CONFIRM_STAGING=YES npm run test:e2e:operations
```

| Date | Commit | Environment | Organization | Vehicle | Route | Driver | Journey | Incident | Result |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Pending | Pending | staging | Pending | Pending | Pending | Pending | Pending | Pending | Pending |

## Android locked-screen tests

Follow `native/android/README.md`.

| Date | Commit | Device | Android | Battery optimization | Locked duration | Largest GPS gap | Service survived | Result |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Pending | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Pending |

## External integrations

| Integration | Configured | Live check | Evidence/notes |
| --- | --- | --- | --- |
| MongoDB | Pending | Pending | |
| Redis | Pending | Pending | |
| Mapbox | Pending | Pending | |
| Resend | Pending | Pending | |
| Mercado Pago | Pending | Pending | |
| Web Push VAPID | Pending | Pending | |
| Cloudinary | Pending | Pending | |
| TOTP platform_admin | Pending | Pending | |
