import { readFileSync } from "node:fs";

const files={
  prepare:readFileSync("scripts/prepare-native-android.mjs","utf8"),
  plugin:readFileSync("native/android/ManeCombLocationPlugin.kt","utf8"),
  service:readFileSync("native/android/ManeCombLocationService.kt","utf8"),
  store:readFileSync("native/android/ManeCombLocationStore.kt","utf8"),
  bridge:readFileSync("src/lib/native-location.ts","utf8"),
  telemetry:readFileSync("src/core/services/telemetry.ts","utf8")
};

const checks=[
  ["Capacitor copies the Kotlin plugin",files.prepare.includes("ManeCombLocationPlugin.kt")],
  ["Capacitor copies the foreground service",files.prepare.includes("ManeCombLocationService.kt")],
  ["Capacitor registers the plugin",files.prepare.includes("registerPlugin(ManeCombLocationPlugin.class)")],
  ["Foreground location service is declared",files.prepare.includes("foregroundServiceType=\\\"location\\\"")],
  ["Plugin enforces HTTPS outside local development",files.plugin.includes("Native telemetry requires HTTPS outside local development")],
  ["Service is sticky across process recreation",files.service.includes("START_STICKY")],
  ["Service uses a connectivity callback",files.service.includes("registerDefaultNetworkCallback")],
  ["Service retains packets on retry",files.service.includes("UploadResult.RETRY")],
  ["SQLite packet IDs are unique",files.store.includes("packet_id TEXT NOT NULL UNIQUE")],
  ["Queue has a retention bound",files.store.includes("MAX_ROWS")&&files.store.includes("MAX_AGE_MS")],
  ["JS bridge requires a running journey id",files.bridge.includes("journeyId is required for native GPS")],
  ["Backend protects packet replay",files.telemetry.includes("PACKET_ID_CONFLICT")&&files.telemetry.includes("$setOnInsert")]
];

const failed=checks.filter(([,ok])=>!ok);
for(const [label,ok] of checks)console.log((ok?"PASS ":"FAIL ")+label);
if(failed.length){
  console.error("[native:audit] "+failed.length+" contract checks failed");
  process.exit(1);
}
console.log("[native:audit] "+checks.length+" baseline contract checks passed");
