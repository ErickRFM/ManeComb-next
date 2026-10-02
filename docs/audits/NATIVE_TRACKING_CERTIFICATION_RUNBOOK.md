# ManeComb Native Tracking — Certification Runbook

This runbook certifies the Android tracking runtime. Emulator smoke is necessary but does not replace physical-device evidence.

## Before the run

1. Use an isolated staging tenant.
2. Record the exact Git SHA and APK version.
3. Confirm the driver is active and has one assigned vehicle.
4. Put the journey in RUNNING state.
5. Confirm the Android location permission is **precise**.
6. Record whether battery optimization is enabled or exempted.
7. Do not include cookies, web sessions or device tokens in evidence.

## Baseline: visible application

Run for at least 10 minutes.

Expected:
- foreground notification remains visible;
- `serviceState=TRACKING`;
- queue returns to zero on healthy network;
- portal map receives monotonic movement;
- no duplicate logical packets.

## Background / Home

Move the app to Home for 30 minutes.

Expected:
- tracking continues;
- no dependency on WebView timers;
- foreground service remains present;
- queue remains bounded;
- portal continues receiving telemetry.

## Lock screen

Lock the device for 30 minutes.

Expected:
- tracking continues;
- no unexplained service termination;
- maximum GPS gap remains inside the product freshness tolerance.

Repeat for 2 hours and, before production certification, 4 hours minimum.

## Network interruption

1. Start on Wi-Fi.
2. Disable all network for 20 minutes while moving.
3. Confirm local queue grows.
4. Restore cellular or Wi-Fi.
5. Measure recovery latency.
6. Reconcile captured packets against accepted backend packets.

Required:
- FIFO backlog recovery;
- stable `packetId`;
- no logical duplicates;
- acknowledged backlog recovery = 100%.

## Network handoff

Test:
- Wi-Fi → cellular;
- cellular → Wi-Fi;
- cellular → offline → Wi-Fi.

Measure p50/p95 reconnect time.

## Doze

On a dedicated test device:

```powershell
adb shell dumpsys deviceidle force-idle
# execute the scenario
adb shell dumpsys deviceidle unforce
```

Or use:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/native-certification.ps1 -DurationMinutes 30 -ForceDoze
```

Do not force Doze on a personal device without understanding the effect.

## Journey lifecycle

### Pause
- Journey RUNNING.
- Native tracking active.
- Press Pause.
- Confirm server returns PAUSED.
- Confirm native capture stops immediately.

### Resume
- Resume journey.
- Explicitly start tracking if it is not already active.
- Confirm a new scoped device session is issued.

### Finish
- Finish journey.
- Confirm tracking stops.
- Confirm the old native token can no longer submit telemetry.

### Driver deactivation
- Deactivate the driver from the Portal/Admin surface.
- Confirm the next device-session validation revokes native telemetry access.

## Process recreation

With active tracking:
- move app to Home;
- allow Android to recreate the process or use a controlled test;
- verify sticky service behavior uses persisted operational assignment only when `restartAllowed=true`.

Manual Stop must set `restartAllowed=false` and must not resurrect tracking after process recreation.

## Swipe recents

Record OEM behavior. Do not assume that swipe-recents equals force-stop.

Expected product behavior:
- no silent data corruption;
- if OEM kills the service, diagnostics/evidence must show it;
- document vendor-specific battery policy.

## Camera / attachments

Current implementation uses WebView file chooser. Test separately:

- gallery;
- camera chooser;
- cancel;
- JPEG/PNG/WebP;
- large image;
- portrait/landscape;
- return after process recreation.

Do not add a native Camera plugin unless ManeComb Next reproduces a real requirement failure.

## Push

Web Push is not equivalent to certified native Android push. Do not mark terminated-app push PASS until a native push path is configured and tested.

## Evidence collector

```powershell
powershell -ExecutionPolicy Bypass -File scripts/native-certification.ps1 -DurationMinutes 30
```

The collector records device/package/battery/power/location state and filtered ManeComb location logs.

After the run, manually reconcile backend telemetry counts with the local evidence template:

`docs/audits/NATIVE_TRACKING_EVIDENCE_TEMPLATE.md`

## Provisional acceptance thresholds

| Gate | Requirement |
| --- | --- |
| Logical duplicates | 0 |
| Backlog recovery | 100% of acknowledged local queue |
| Loss after successful local enqueue | < 0.5% |
| Reconnect p95 | < 15 s |
| Unexplained service termination | 0 |
| Lock-screen tracking | continuous inside freshness tolerance |

Thresholds may be revised only after recording a baseline, not to hide a failing run.

## Certification rule

No physical case is PASS merely because:
- TypeScript builds;
- Gradle builds;
- APK installs;
- emulator opens.

A physical case is PASS only when its evidence file contains the device/build identifiers, measured counters and observed result.
