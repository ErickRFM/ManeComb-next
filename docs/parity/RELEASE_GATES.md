# ManeComb Next — Convergence release gates

## Per-PR mandatory gates

Every convergence PR must record:

- WHAT changed.
- WHY it is needed.
- Legacy behavior being preserved or rejected.
- New authority after merge.
- API/schema impact.
- Android/runtime impact.
- Migration strategy.
- Rollback strategy.
- Tests executed.

## Automated gates

Required when relevant:

```
npm run typecheck
npm test
npm run test:integration
npm run build
npm run audit:native
UX QA
Android smoke API 33 / 34 / 35 / 36
```

A native PR must not weaken an existing backend device-session, tenant, idempotency or replay-protection invariant.

## Release trains

### Runtime RC

Requires:

- full-stack HTTPS staging
- device-token secure storage
- GPS lifecycle hardening
- traceable APK metadata

Physical QA remains **PENDING USER TESTING** until executed by the user.

### Communication RC

Requires:

- Android push
- PTT lifecycle path
- RTC lifecycle path
- TURN configuration validation
- chat regression suite

### Operations RC

Requires:

- route assignment migration
- profile/session center
- document lifecycle
- incident evidence
- operational metrics

### Production RC

Requires:

- platform RBAC
- entitlements
- provider readiness
- observability
- tenant-isolation regression
- staging soak

## Never claim

Do not claim a PASS for:

- screen locked
- Doze
- OEM battery management
- Bluetooth/headset routing
- real cellular handoff
- incoming call while app terminated
- GPS continuity on physical hardware

unless that scenario was actually executed and evidence recorded.
