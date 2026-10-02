# ManeComb Next — Master parity and convergence matrix

Date: 2026-10-01  
Baseline: `main@4676eb06fb37b7ec9c6b9410b6fa74841fdcccfd`

## Principle

ManeComb Next remains the architectural authority. Legacy ManeComb is a source of proven product behavior and native runtime patterns, not a codebase to copy wholesale.

Every legacy capability is classified as:

- **KEEP** — Next implementation is already the authority.
- **PORT** — capability should be reimplemented behind Next contracts.
- **REDESIGN** — preserve the user/product need, not the old implementation.
- **DEFER** — valuable but not required for the current release train.
- **REJECT** — do not reintroduce because it recreates duplicate architecture.

## System-level decisions

| Capability | Legacy ManeComb | ManeComb Next baseline | Decision | Release priority |
| --- | --- | --- | --- | --- |
| Web / Portal | Vite/React surfaces | Next App Router | KEEP | P0 |
| Backend | Express service | Next Route Handlers + persistent Node server | KEEP | P0 |
| Realtime | Socket.IO services | Socket.IO in persistent Node runtime | KEEP | P0 |
| Queue / async delivery | separate communication service | Outbox + BullMQ worker | KEEP | P0 |
| Android GPS | Kotlin service | Kotlin foreground service + SQLite queue | KEEP + HARDEN | P0 |
| Native credential storage | Keychain/secure native store | device token in private SharedPreferences | PORT | P0 |
| Push | FCM Android | Web Push VAPID | REDESIGN as Web Push + FCM providers | P0 |
| Radio / PTT | native Kotlin audio runtime | browser MediaRecorder / WebView | PORT behind Capacitor plugin | P0/P1 |
| RTC | native WebRTC/call service | browser WebRTC / WebView | PORT lifecycle layer | P0/P1 |
| Chat | rich conversation + E2EE + media | text/image + ACK/retry | REDESIGN incrementally | P1 |
| User profile | rich profile/lifecycle | compact user model | REDESIGN | P1 |
| Session center | device/refresh lifecycle | compact JTI session | REDESIGN | P1 |
| Route assignments | multiple scheduled assignments | direct vehicle route projection | PORT via new authority model | P1 |
| Route learning | rich evidence model / segments | basic candidate model | REDESIGN | P1/P2 |
| Journey metrics | persisted operational aggregates | lifecycle-first journey | PORT as separate metrics authority | P1 |
| Documents | version/supersede/delete lifecycle | basic review lifecycle | PORT | P1 |
| Incidents | severity/media/freshness/evidence | compact incident | PORT and extend | P1 |
| Platform RBAC | platform roles separated | platform channel + tenant roles | REDESIGN | P1 |
| Commercial add-ons | feature flags/add-ons/onboarding | base plans + billing | REDESIGN as entitlements | P2 |
| Observability | external error reporting + metrics | health/metrics/audit | REDESIGN | P1 |
| Separate Vite/Admin/mobile/backend apps | multiple runtimes | single Next core | REJECT | permanent |

## Authority rules

1. **Next remains the only business/domain authority.**
2. Native Android code may own OS-level execution only: background location, secure device storage, push rendering, microphone/audio routing and call lifecycle.
3. Native services must use versioned Next API/socket contracts; they must not create parallel business stores.
4. MongoDB remains the system of record for product data.
5. Redis is coordination/queue infrastructure, not product truth.
6. The browser/WebView remains the presentation authority for the installed app unless a capability explicitly requires native OS control.

## Migration pattern

Every schema or contract migration follows:

```
ADD
 -> DUAL WRITE
 -> BACKFILL
 -> DUAL READ
 -> SWITCH AUTHORITY
 -> OBSERVE
 -> REMOVE LEGACY
```

Destructive replacement in a single deployment is prohibited for route assignments, chat conversations, sessions, documents, incidents and platform roles.

## Work trains

### Train A — Runtime reliability

- native bridge baseline and contract audit
- secure device-token storage
- GPS cadence/accuracy/lifecycle hardening
- richer native status and events
- full-stack staging endpoint
- traceable APK for user physical QA

### Train B — Android communication

- FCM endpoint provider
- notification deep links/actions
- PTT native service behind existing radio socket protocol
- RTC foreground-call lifecycle behind existing signaling

### Train C — Communication domain

- Conversation authority
- unread/read state
- edit/delete/revision
- voice/media attachments
- E2EE ADR and incremental implementation

### Train D — Operations domain

- session center/profile
- VehicleRouteAssignment V2
- route-learning evidence V2
- JourneyMetrics
- Document lifecycle V2
- Incident evidence V2

### Train E — Platform and production

- platform-specific RBAC
- commercial entitlements
- observability
- production deployment certification

## Explicit non-goals

Do not reintroduce:

- React Native as a second UI runtime;
- a second Express backend;
- a separate communication backend;
- a separate Admin application;
- duplicate data stores;
- duplicate auth authorities.

## Physical QA policy

Physical-device validation is performed by the user from a traceable APK. CI must not fake a hardware PASS. CI may certify compilation, generated Android contract, API 33–36 smoke, static configuration and artifact metadata.

## Exit condition

ManeComb Next is considered parity-complete only when each PORT/REDESIGN item above is either certified and merged or explicitly moved to DEFER with a documented product decision.
