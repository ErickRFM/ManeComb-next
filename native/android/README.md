# Android native location bridge

This directory contains the native source that complements the Next.js/PWA driver surface when ManeComb must continue transmitting GPS with the screen locked.

## Integration

1. Run `npm run native:add` once to generate Capacitor's `android/` project.
2. Copy the Kotlin files from this directory into `android/app/src/main/java/com/manecomb/location/`.
3. Merge the permissions/service declarations from `AndroidManifest.snippet.xml` into the generated manifest.
4. Register `ManeCombLocationPlugin` in `MainActivity`.
5. Set `CAPACITOR_SERVER_URL=https://<production-host>` and run `npm run native:sync`.

The plugin reads the HttpOnly ManeComb session cookie from Android WebView CookieManager and passes it only to the foreground service. JavaScript never receives the cookie. The service posts telemetry directly to `/api/locations/telemetry`, so WebView suspension does not stop tracking.

Production must use HTTPS. The PWA path remains available as a fallback, but reliable locked-screen tracking uses this foreground service.

## Locked-screen certification protocol

Run this on a physical Android device against staging before every production release.

### Preconditions

- Driver has an assigned journey in `RUNNING`.
- Foreground location permission is granted and background/precise location is enabled where Android requires it.
- The ManeComb foreground-service notification is visible.
- Staging portal is open on another device so GPS freshness can be observed independently.
- Record Android model, OS version, app build SHA and battery-optimization state in the validation log.

### Test A — screen locked

1. Start the native location service from ManeComb.
2. Confirm at least three live points in the portal.
3. Lock the phone for 30 minutes without reopening the app.
4. Verify the unit never reaches `lost` and returns to `live` continuously as points arrive.
5. Unlock the phone and confirm the same journey/session continues.

### Test B — app backgrounded

1. Start a running journey and native location service.
2. Press Home and use another app for 30 minutes.
3. Verify telemetry remains present in `/api/locations/live` and the foreground-service notification stays active.

### Test C — battery optimization

Run Test A twice: once with normal device defaults and once after explicitly removing ManeComb from battery optimization. If the OEM suspends the service under default optimization, document the device-specific user instruction and require the exemption during onboarding.

Useful ADB evidence:

```bash
adb shell dumpsys activity services | grep -i ManeComb
adb shell dumpsys deviceidle
adb shell dumpsys battery
adb logcat | grep -i -E "ManeComb|LocationService|FusedLocation"
```

### Release acceptance

Pass only when:

- no unexplained service termination occurs;
- the foreground notification remains visible while tracking;
- GPS gaps stay within the product freshness tolerance;
- locking/unlocking does not create a duplicate journey;
- logout or journey finish stops native tracking;
- the portal receives the final point before the service stops.

Save screenshots/log excerpts and device metadata in `docs/quality/VALIDATION_LOG.md`.
