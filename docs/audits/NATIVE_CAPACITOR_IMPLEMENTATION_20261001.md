# ManeComb Next — Native/Capacitor implementation record

Date: 2026-10-01  
Integration branch: `integration/native-capacitor-certification`

This record sits on top of the immutable baseline audit in `NATIVE_CAPACITOR_AUDIT_20261001.md`.

## Architecture decision

The Android application remains:

```
Next.js / React UI
       |
       v
Capacitor bridge
       |
       v
Kotlin native tracking runtime
       |
       v
ManeComb Node/Next API
```

There is no second business application in Kotlin. Kotlin owns only OS-level behavior that the WebView cannot guarantee.

## Baseline findings incorporated

The audit proved the repository already had:
- Capacitor 7 Android wrapper generation;
- custom ManeComb location plugin;
- Android foreground location service;
- SQLite offline FIFO;
- scoped native device session;
- packetId idempotency;
- retry/backoff;
- network callback;
- API 33–36 emulator smoke.

Therefore this work hardens the existing runtime instead of replacing it.

## Runtime hardening implemented

### Native credential security

The scoped `mcdev_` telemetry credential is now protected by Android Keystore using AES/GCM.

- new installs do not persist it as plaintext;
- a legacy plaintext value is migrated on first read;
- plaintext key is removed after successful migration;
- explicit stop and auth failure clear the stored native credential.

The credential remains scoped server-side to the driver, vehicle and RUNNING journey.

### Journey authority

The backend remains final authority.

- PAUSE immediately revokes active DeviceSession rows for the journey;
- FINISH/CANCEL continue to revoke native sessions;
- driver disabled / vehicle reassigned / journey no longer RUNNING are independently rejected by `requireDeviceTelemetrySession`;
- START/RESUME creates a new scoped native session before Android tracking starts.

The client also stops local capture after the server confirms a non-RUNNING state. This is UX cleanup, not the security boundary.

### Native cadence policy

The native layer has an explicit cadence/quality policy:

- GPS request interval: 3 s;
- network provider interval: 5 s;
- minimum enqueue interval: 2.5 s;
- fixes worse than 120 m accuracy are rejected by the current baseline policy.

These values are now named policy constants so future tuning requires an evidence-backed change instead of hidden magic numbers.

### State contract

Native tracking exposes contract version 2 and runtime state.

Observable fields are non-sensitive:

- running;
- state;
- queue depth;
- network available;
- last capture timestamp;
- last successful upload timestamp;
- retry delay;
- last error class.

The service broadcasts state transitions to the Capacitor plugin and the plugin emits `trackingState` listeners to React.

### Driver UI

The driver console now reacts to native state events instead of only reading one status snapshot on mount.

It shows:
- tracking state;
- network state;
- local queue depth;
- contract version;
- non-sensitive diagnostic code.

### Offline resilience

Existing SQLite behavior is preserved:
- unique packet ID;
- FIFO;
- bounded retention;
- packet retained on retry;
- exponential retry;
- flush on network recovery.

No duplicate offline store or WorkManager queue was introduced.

### Telemetry observability

Native packets append a bounded `client` object to the existing telemetry request.

Allowed information:
- platform;
- native contract version;
- app version name/code;
- queue depth;
- network availability;
- native state.

Not sent:
- token;
- cookie;
- raw device identifier;
- email;
- user name;
- secrets.

The backend validates and stores the latest bounded diagnostics on the scoped DeviceSession. The Portal live endpoint can expose the latest active session diagnostics with each unit.

### Portal diagnosis

The unit Telemetría tab can show:
- native contract version;
- APK version/build;
- native service state;
- device network state;
- latest local queue depth;
- last native session report.

This is operational diagnosis; it does not replace server telemetry freshness.

## CI / generated Android certification

The Android project remains generated and ignored.

The pipeline now has three source-to-artifact gates:

1. `npm run audit:native`
   - validates source contracts including Keystore, cadence, lifecycle, packet replay and state events.

2. `npm run verify:native-generated`
   - runs after `native:prepare`;
   - verifies generated Kotlin files, manifest permissions/service registration, plugin registration, Kotlin/JVM configuration and credential helpers.

3. `npm run report:native-build`
   - records generated SDK/build metadata and debug APK size.

API 33, 34, 35 and 36 remain in the emulator matrix.

## Physical certification support

`scripts/native-certification.ps1` captures ADB evidence without declaring a PASS automatically.

The runbook covers:
- foreground;
- Home/background;
- lock screen;
- Doze;
- Battery Saver;
- Wi-Fi/cellular handoff;
- total network loss and backlog recovery;
- process recreation;
- swipe recents;
- journey pause/finish;
- driver deactivation.

Physical cases remain PENDING until a real device run produces evidence.

## Camera / attachments

Current ManeComb Next chat uses the Android WebView file chooser through an HTML file input.

No Camera plugin is added in this pass because the Next app has not yet produced evidence that a native camera bridge is required.

Required physical cases:
- gallery;
- camera chooser;
- cancellation;
- large image;
- portrait/landscape;
- process recreation.

If a repeatable failure exists, prefer an official/stable Capacitor plugin before a custom Kotlin camera implementation.

## Push notifications

Current Web Push is not treated as equivalent to native terminated-app Android push.

Native push remains an external release gap requiring Android provider configuration (for example FCM credentials/config) before it can be certified.

## PTT / RTC

PTT/audio remains isolated from GPS.

Do not put microphone, audio focus, Bluetooth routing or call interruption logic into the location plugin.

## Explicitly deferred

These are intentionally not implemented without evidence:

- FusedLocationProvider migration;
- BOOT_COMPLETED auto-resume;
- ACCESS_BACKGROUND_LOCATION expansion;
- WorkManager GPS queue;
- custom native Camera implementation;
- native PTT inside tracking;
- deletion of browser geolocation fallback.

## Cleanup rule

Legacy/browser fallback is removed only after physical native certification demonstrates that the replacement covers its intended Android cases.

## Release classification

Code/CI gates can be automated.

The following can never be auto-certified from a GitHub build alone:
- hours-long lock-screen continuity;
- OEM battery policy;
- real cellular handoff;
- real GPS movement;
- physical battery consumption;
- terminated-app native push.

Until those are tested, the release state is **CODE_READY / PHYSICAL_CERTIFICATION_PENDING**, not production-certified.
