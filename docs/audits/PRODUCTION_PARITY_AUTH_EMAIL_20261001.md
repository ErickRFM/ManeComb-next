# ManeComb Next — Production parity audit: auth + email

Date: 2026-10-01  
Base: `main@13ef04ff3fe789079d886484416ed1d7e06d7357`  
Work branch: `fix/production-parity-auth-email-20261001`

## Scope closed in code

- Password visibility control added to login, registration and password reset.
- Technical authentication error codes are no longer shown directly to users.
- Password reset now confirms the new password in UI.
- Password reset increments `credentialVersion`, revokes prior sessions and emits a password-changed email event.
- Recovery and welcome emails now use semantic outbox idempotency keys.
- Driver email changes revoke prior sessions and emit an email-changed notification.
- Driver activation/deactivation emits account status notifications.
- Platform organization suspension/reactivation emits owner notifications.
- Outbox now models `processing`, `retry_pending` and `failed_final` separately from `processed`.
- Worker provider result IDs are persisted as `providerMessageId`.
- Worker no longer marks an event final-failed while BullMQ still has retries available.
- Controlled Resend provider smoke command added: `npm run verify:email-provider`.
- Auth error mapping test added.

## Legacy parity restored in this pass

| Legacy event / behavior | ManeComb Next status |
| --- | --- |
| WELCOME | connected + idempotent |
| PASSWORD_RESET | connected + idempotent |
| PASSWORD_CHANGED | restored |
| EMAIL_CHANGED | restored for driver account management |
| ACCOUNT_SUSPENDED | restored for drivers and organizations |
| ACCOUNT_REACTIVATED | restored for drivers and organizations |
| Session revocation after password change | restored |
| Session revocation after driver email change | restored |
| Provider attempt observability | improved through explicit lifecycle + provider id |

## Deployment contract

The production topology remains:

```
Cloudflare / manecomb.com
        |
        v
Render Web (Next.js + Node + Socket.IO)
        |
        +---- MongoDB Atlas
        +---- Render Redis
        |
        v
Render Communication Worker
        |
        +---- BullMQ
        +---- Resend
        +---- Web Push
```

The Vercel preview URL must not be treated as the authoritative production runtime for login/realtime while Redis, BullMQ, Socket.IO and the communication worker are part of the application contract.

## Live deployment evidence checked on 2026-10-01

Render currently exposes only the legacy `ErickRFM/ManeComb` services (`ManeComb` and `manecomb-backend-sandbox`). No `ManeComb-next` web, worker or dedicated Redis resource is provisioned in the connected Render workspace yet.

The legacy production backend was checked through Render logs and its communication runtime reported:

- `emailEnabled: true`
- `emailDryRun: false`
- `providerConfigured: true`
- `queueMode: bullmq`
- `queueConnected: true`
- `queueFunctional: true`
- `workerStarted: true`
- `idempotencyIndexVerified: true`
- `durableOutbox: true`
- `productionDurability: true`

The same Render service also logged successful Resend deliveries for `WELCOME`, `ORDER_CREATED` and `PASSWORD_RESET`. This confirms the legacy ManeComb backend still has a live, functional mail path. It does **not** certify ManeComb Next because the Next Render topology has not been provisioned.

## Release gates still requiring live infrastructure

These are not code-only checks and must be performed against the deployed environment:

1. `/api/health/live` returns 200.
2. `/api/health/ready` returns 200.
3. MongoDB Atlas resolves and connects.
4. Redis is reachable from Web and Worker with the same isolated namespace.
5. Communication Worker is running.
6. `npm run verify:email-provider` succeeds with the production Resend sender.
7. Password recovery email is received end to end.
8. Password-changed notification is received.
9. Organization/driver suspension and reactivation notifications are received.
10. Login no longer returns `RATE_LIMIT_UNAVAILABLE`.

## Required environment for email smoke

```
RESEND_API_KEY=...
EMAIL_FROM=ManeComb <verified@manecomb.com>
EMAIL_SMOKE_TO=controlled-test-recipient@example.com
```

`EMAIL_SMOKE_TO` is intentionally not a required runtime variable. It exists only for a controlled release smoke.

## Expected Git gates

```
npm ci
npm audit --omit=dev --audit-level=high
npm run typecheck
npm test
npm run test:integration
npm run build
npm run deploy:check
npm run deploy:check:worker
```

Do not certify production based only on a green build. Provider delivery, Redis connectivity and worker execution remain release gates.
