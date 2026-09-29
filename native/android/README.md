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
