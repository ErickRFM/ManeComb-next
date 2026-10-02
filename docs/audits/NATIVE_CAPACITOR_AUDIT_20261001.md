# ManeComb Next — Native / Capacitor baseline audit

Date: 2026-10-01  
Base: \`main@4676eb06fb37b7ec9c6b9410b6fa74841fdcccfd\`  
Audit branch: \`audit/native-capacitor-baseline-20261001\`

## Executive conclusion

ManeComb Next is **not starting from zero on Android**. The repository already contains a custom Capacitor bridge and a native Kotlin foreground location service. The correct strategy is therefore **stabilize and certify the existing native bridge**, not replace the mobile architecture.

Current responsibility split is already close to the desired model:

- Next/React: UI, map, journey controls, chat and operational surfaces.
- Capacitor: Android wrapper and JavaScript ↔ native bridge.
- Kotlin: background GPS, persistent queue and resilient delivery.
- Node/Next API: authentication, tenant/business rules, telemetry validation and realtime publication.

The largest risk is no longer "there is no native tracking"; the risk is that the existing native layer has **partial observability, lifecycle gaps and unverified physical-device behavior**.

## Baseline versions and generation model

| Item | Baseline |
| --- | --- |
| Repository | \`ErickRFM/ManeComb-next\` |
| Main SHA | \`4676eb06fb37b7ec9c6b9410b6fa74841fdcccfd\` |
| Next.js | \`^15.2.4\` |
| React | \`^19.0.0\` |
| Capacitor Core | \`^7.0.0\` |
| Capacitor Android | \`^7.0.0\` |
| Capacitor CLI | \`^7.0.0\` |
| CI Java | 21 |
| Kotlin Gradle plugin injected by prepare script | 2.1.20 |
| Android project | generated, ignored by Git |
| Android APIs exercised by CI | 33 / 34 / 35 / 36 |

The generated \`android/\` tree is intentionally ignored. \`npm run native:prepare\` creates/syncs it, injects Kotlin support, copies native sources, merges permissions and registers the Capacitor plugin. Because the generated Gradle tree is not committed, **minSdk, targetSdk and AGP are artifact properties and must be captured from the generated build during certification instead of guessed from source**.

## Existing native source

The repository already has:

\`\`\`
native/android/
├── ManeCombLocationPlugin.kt
├── ManeCombLocationService.kt
├── ManeCombLocationStore.kt
├── AndroidManifest.snippet.xml
└── README.md
\`\`\`

\`scripts/prepare-native-android.mjs\` copies the first three Kotlin files into the generated Android package and registers \`ManeCombLocationPlugin\` from \`MainActivity\`.

### Existing capabilities

| Capability | State | Evidence / behavior |
| --- | --- | --- |
| Capacitor custom plugin | EXISTS_AND_VALID | \`ManeCombLocationPlugin\` |
| Foreground Service | EXISTS_AND_VALID | \`ManeCombLocationService\` + notification channel |
| Persistent GPS queue | EXISTS_AND_VALID | SQLite \`ManeCombLocationStore\` |
| Stable packet id | EXISTS_AND_VALID | UUID \`packetId\` per captured location |
| Backend idempotency | EXISTS_AND_VALID | telemetry upsert by tenant + \`packetId\` |
| Retry | EXISTS_AND_VALID | exponential 5s → 60s |
| Network callback | EXISTS_AND_VALID | \`registerDefaultNetworkCallback\` |
| Queue retention | EXISTS_AND_VALID | max 20,000 rows / 24h |
| Sticky service restart | EXISTS_BUT_PARTIAL | \`START_STICKY\` + persisted assignment/token |
| Scoped native token | EXISTS_AND_VALID | \`mcdev_\` device session tied to driver/vehicle/journey |
| HTTPS enforcement | EXISTS_AND_VALID | plugin blocks non-HTTPS except emulator/local |
| Foreground notification | EXISTS_AND_VALID | ongoing notification with pending queue count |
| GPS provider | EXISTS_AND_VALID | Android \`LocationManager\` GPS + network provider |
| FusedLocationProvider | MISSING_BY_DESIGN | no Play Services dependency today |
| Native bridge events | MISSING | JS can only call \`status()\`; no listener stream |
| Persisted diagnostics | PARTIAL | queue persists; live status is process static state |
| Boot receiver | MISSING_BY_DESIGN | no automatic reboot resume |
| WorkManager | MISSING_BY_DESIGN | service owns retry loop |
| Native push / FCM | MISSING | current UI uses Web Push |
| Capacitor Camera plugin | MISSING | chat uses WebView file input |
| Native PTT/audio service | MISSING | separate subsystem; not part of GPS plugin |

## Current GPS flow

### Native Android

\`\`\`
DriverConsole
   |
   | POST /api/auth/device-session
   v
short-scope mcdev_ token
   |
   v
ManeCombLocationPlugin.start()
   |
   v
ManeCombLocationService
   |
   +--> LocationManager GPS (3s / 3m)
   +--> LocationManager Network (5s / 5m)
   |
   v
SQLite queue
   |
   v
HTTP POST /api/locations/telemetry
   |
   v
device-session validation
   |
   v
recordTelemetry()
   |
   +--> packetId idempotency
   +--> route progress
   +--> monotonic vehicle lastLocation
   |
   v
Socket.IO location:snapshot
\`\`\`

### Browser fallback

When Capacitor native mode is unavailable, \`DriverConsole\` still uses \`navigator.geolocation.watchPosition\`. It explicitly tells the user the screen must remain active.

This separation is correct: browser geolocation remains a fallback, while Android background tracking uses Kotlin.

## Security findings

### PASS — device token scope

The native token cannot be used as a Portal/Chat/Admin session. The telemetry route recognizes \`mcdev_\`, validates the DeviceSession and requires the authenticated driver, vehicle and journey to still match a RUNNING assignment.

### PASS — token invalidation through state

\`requireDeviceTelemetrySession\` re-checks:

- active mobile user;
- RUNNING journey;
- vehicle assignment.

When the relationship is no longer valid, it revokes the DeviceSession and returns unauthorized.

### PASS — replay protection

The backend stores telemetry by \`packetId\`. A replay returns the canonical stored packet instead of replacing coordinates.

### REVIEW — token persistence

The native service stores the device token in private SharedPreferences to survive process recreation. This is required for \`START_STICKY\`, but a later hardening pass should evaluate Android Keystore-backed storage for the token if physical threat requirements justify it.

## Lifecycle findings

### P0 — tracking/journey lifecycle is only indirectly coupled

Pausing or finishing a journey does not directly call \`stopNativeLocation()\`. The server invalidates the native token on the next telemetry request because the journey is no longer RUNNING, and the service then removes location updates.

This is fail-safe server-side, but not clean UX. Desired behavior:

- PAUSE / FINISH / CANCEL should stop native capture immediately after server confirmation.
- START / RESUME should expose one obvious path to re-enable tracking.
- the backend remains the final authority even if the client fails to stop.

### P1 — status is too shallow

Current native \`status()\` returns only:

- running;
- pendingPackets.

For field diagnosis it should eventually expose non-sensitive operational state:

- service state;
- queue depth;
- network state;
- last capture time;
- last successful upload time;
- retry state;
- tracking implementation version.

### P1 — no native state event stream

The plugin does not call \`notifyListeners\`. The UI checks status once on mount and therefore cannot react immediately to:

- auth failure;
- offline transition;
- queue growth;
- service restart;
- provider disabled.

A v2 bridge should add events without removing the existing methods until migration is certified.

### P1 — explicit stop does not distinguish manual stop from process restart

\`stopService()\` stops capture, while persisted assignment/token remain for sticky restart semantics. Explicit user stop and system restart are different intents and should be distinguishable before boot recovery is added.

## Location provider decision

The plan initially considered FusedLocationProvider. The audit does **not** justify replacing \`LocationManager\` immediately.

Reasons:

1. current implementation already receives GPS + network provider updates;
2. it avoids adding Google Play Services as a hard dependency;
3. changing the provider before baseline field measurements would mix architecture work with tuning;
4. native complexity should only be added when evidence shows the existing solution is insufficient.

Decision: **retain LocationManager for Native Tracking V1.1; benchmark it first.** A FusedLocationProvider migration is a later experiment if battery, accuracy or OEM behavior fails the physical acceptance gates.

## Permission audit

Generated manifest currently injects:

- ACCESS_NETWORK_STATE
- ACCESS_COARSE_LOCATION
- ACCESS_FINE_LOCATION
- FOREGROUND_SERVICE
- FOREGROUND_SERVICE_LOCATION
- POST_NOTIFICATIONS
- WAKE_LOCK
- RECORD_AUDIO
- MODIFY_AUDIO_SETTINGS
- CAMERA
- BLUETOOTH_CONNECT
- BLUETOOTH_SCAN

Findings:

- location runtime permission is handled by the Capacitor plugin;
- precise-vs-approximate behavior needs explicit Android 12+ verification;
- POST_NOTIFICATIONS is declared but not handled by this location plugin;
- microphone/camera/Bluetooth permissions belong to other capabilities and should not become part of the GPS plugin contract;
- ACCESS_BACKGROUND_LOCATION is intentionally not added yet. The current model starts a location foreground service while the user is in the app. It should only be added if a documented background-start/boot requirement makes it necessary.

## Camera / attachment audit

Current chat attachment UX uses a WebView file input accepting JPEG/PNG/WebP. There is no \`@capacitor/camera\` dependency and no custom camera plugin.

Decision:

- do not add a native camera plugin solely because the legacy app crashed;
- reproduce the problem on ManeComb Next first;
- test gallery, camera chooser, cancellation, large images, rotation and process recreation;
- add Capacitor Camera/File Picker only if the WebView chooser is insufficient.

## Push notification audit

The current \`PushOptIn\` is Web Push / service-worker based. That path is appropriate for browsers, but it is **not yet a certified Android-native push implementation**.

This is a distinct production gap from GPS.

Before claiming background push on the APK, certify a native push path and resolve the external Android configuration requirement. Until then, Web Push capability must not be treated as equivalent to native Android push when the app is terminated.

## PTT / RTC audit

PTT/audio is not mixed into the GPS plugin, which is correct. Audit separately:

- microphone permission;
- audio focus;
- Bluetooth routing;
- headset/speaker behavior;
- background audio;
- phone-call interruptions;
- TURN on different networks.

No GPS refactor should absorb PTT.

## Backend telemetry quality

Current backend already protects several important invariants:

- tenant-scoped vehicle;
- driver assignment;
- RUNNING journey;
- packet idempotency;
- capture-to-ingest metric;
- route projection;
- last-location monotonicity by \`recordedAt\`;
- Socket.IO coalescing for map subscribers.

Native Tracking V2 should preserve the existing HTTP telemetry contract instead of inventing a second backend.

## APK / generated project audit

\`android/\` is generated and ignored. This keeps source duplication low, but creates two release requirements:

1. \`native:prepare\` must remain deterministic.
2. CI must validate the generated wrapper every time native sources or the prepare script change.

Current UX QA already builds and installs a debug APK on API 33–36.

Gap: current emulator smoke validates build/install/open/orientation, **not GPS foreground-service behavior, permissions, queue recovery or lock-screen continuity**.

## Priority register

### P0 — fix before native certification

1. Couple successful journey pause/finish with immediate native GPS stop.
2. Add tests for the journey ↔ native tracking lifecycle.
3. Add explicit native state contract/versioning before expanding the plugin.
4. Preserve backend idempotency and device-session security exactly.

### P1 — implement for diagnosability

1. Rich native status.
2. Native state events.
3. network / queue / last-upload visibility.
4. deterministic static audit of generated bridge prerequisites.
5. physical-device evidence template.
6. APK size measurement in CI.

### P1 — external capability gap

Native Android push remains uncertified until native push configuration exists.

### P2 — only after evidence

1. FusedLocationProvider migration.
2. boot auto-resume;
3. background-start permission expansion;
4. native Camera/File Picker replacement;
5. Keystore migration for device token;
6. native PTT service.

## Acceptance evidence required

Physical evidence remains mandatory for:

- visible app;
- Home/background;
- screen locked;
- 30 min;
- 2 h;
- 4 h minimum;
- Wi-Fi → cellular;
- cellular → offline → recovery;
- Doze;
- battery saver;
- process recreation;
- swipe recents;
- explicit journey pause/finish;
- driver deactivation;
- expired/revoked device session.

Record git SHA, APK version, device model/API, duration, captured/accepted counts, queue peak, duplicates, losses, maximum gap, reconnect latency and battery delta. Never store tokens or cookies.

## Quantitative provisional gates

- logical duplicates: 0;
- acknowledged backlog recovery: 100%;
- location packet loss after successful local enqueue: < 0.5%;
- reconnect after network recovery: < 15s p95;
- unexplained service termination: 0 in certification run;
- lock-screen tracking: continuous within product freshness tolerance.

## Work plan authorized by this audit

### PR B — native tracking contract

- versioned status types;
- explicit state machine;
- JS bridge events;
- tests.

### PR C — lifecycle hardening

- immediate stop after PAUSE/FINISH/CANCEL;
- explicit behavior on RESUME;
- server remains authoritative;
- regression tests.

### PR D — diagnostics and offline certification

- queue/network/upload diagnostics;
- CI contract checks;
- evidence template;
- generated APK metadata.

### PR E — physical certification support

- scripts for ADB/Doze/network evidence;
- no fake PASS for physical gates.

### PR F — cleanup

Only after physical validation: remove dead adapters and redundant paths while keeping the browser fallback intentionally.

## Final architecture target

\`\`\`
ManeComb Next / React
        |
        | Capacitor bridge
        v
ManeComb native plugin
        |
        v
Kotlin Foreground Service
        |
        +--> Android LocationManager (baseline)
        +--> SQLite queue
        +--> Connectivity callback
        +--> retry/backoff
        |
        v
/api/locations/telemetry
        |
        +--> device-session authority
        +--> packetId idempotency
        +--> route projection
        +--> monotonic lastLocation
        |
        v
Socket.IO / Portal map
\`\`\`

This audit authorizes **incremental hardening of the existing bridge**, not a rewrite.
