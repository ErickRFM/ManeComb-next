import { existsSync, readFileSync } from "node:fs";

const required=[
  "android/app/src/main/AndroidManifest.xml",
  "android/app/src/main/java/com/manecomb/app/MainActivity.java",
  "android/app/src/main/java/com/manecomb/location/ManeCombLocationPlugin.kt",
  "android/app/src/main/java/com/manecomb/location/ManeCombLocationService.kt",
  "android/app/src/main/java/com/manecomb/location/ManeCombLocationStore.kt",
  "android/app/src/main/java/com/manecomb/location/ManeCombSecureStore.kt",
  "android/app/src/main/java/com/manecomb/location/ManeCombLocationCredentials.kt",
  "android/app/src/main/java/com/manecomb/location/ManeCombLocationCadence.kt",
  "android/app/src/main/assets/capacitor.config.json",
  "android/app/build.gradle"
];

const missing=required.filter(path=>!existsSync(path));
if(missing.length){
  for(const path of missing)console.error("FAIL missing generated file: "+path);
  process.exit(1);
}

const manifest=readFileSync("android/app/src/main/AndroidManifest.xml","utf8");
const activity=readFileSync("android/app/src/main/java/com/manecomb/app/MainActivity.java","utf8");
const gradle=readFileSync("android/app/build.gradle","utf8");
const secure=readFileSync("android/app/src/main/java/com/manecomb/location/ManeCombSecureStore.kt","utf8");
const credentials=readFileSync("android/app/src/main/java/com/manecomb/location/ManeCombLocationCredentials.kt","utf8");
const capacitorConfig=JSON.parse(readFileSync("android/app/src/main/assets/capacitor.config.json","utf8"));
const capacitorServerUrl=capacitorConfig?.server?.url;
let parsedServerUrl=null;
try{ if(capacitorServerUrl)parsedServerUrl=new URL(capacitorServerUrl); }catch{}
const localHosts=new Set(["localhost","127.0.0.1","10.0.2.2"]);
const hasBundledIndex=existsSync("android/app/src/main/assets/public/index.html");

const checks=[
  ["fine location permission",manifest.includes("android.permission.ACCESS_FINE_LOCATION")],
  ["foreground service permission",manifest.includes("android.permission.FOREGROUND_SERVICE")],
  ["foreground location permission",manifest.includes("android.permission.FOREGROUND_SERVICE_LOCATION")],
  ["network state permission",manifest.includes("android.permission.ACCESS_NETWORK_STATE")],
  ["ManeComb location service",manifest.includes("com.manecomb.location.ManeCombLocationService")],
  ["location foregroundServiceType",manifest.includes('android:foregroundServiceType="location"')],
  ["plugin registered in MainActivity",activity.includes("registerPlugin(ManeCombLocationPlugin.class)")],
  ["Kotlin Android plugin enabled",gradle.includes("org.jetbrains.kotlin.android")||gradle.includes("kotlin-android")],
  ["JVM 21 target configured",gradle.includes("jvmTarget = '21'")||gradle.includes('jvmTarget = "21"')],
  ["Capacitor WebView has a bootstrap source",Boolean(capacitorServerUrl)||hasBundledIndex],
  ["Capacitor server URL is parseable",Boolean(parsedServerUrl)],
  ["Capacitor appStartPath is configured",typeof capacitorConfig?.server?.appStartPath==="string"&&capacitorConfig.server.appStartPath.startsWith("/")],
  ["Capacitor installed entry uses /app",capacitorConfig?.server?.appStartPath==="/app"||capacitorConfig?.server?.appStartPath?.startsWith("/visual-qa/")],
  ["Capacitor production server uses HTTPS",Boolean(parsedServerUrl&&(parsedServerUrl.protocol==="https:"||localHosts.has(parsedServerUrl.hostname)))],
  ["Capacitor native error page configured",capacitorConfig?.server?.errorPath==="native-error.html"&&existsSync("android/app/src/main/assets/public/native-error.html")],
  ["Android Keystore native token protection",secure.includes("AndroidKeyStore")&&credentials.includes("deviceTokenEncrypted")],
  ["Legacy plaintext device token migration",credentials.includes("LEGACY_TOKEN")&&credentials.includes("remove(LEGACY_TOKEN)")]
];

let failures=0;
for(const [name,ok] of checks){
  console.log((ok?"PASS ":"FAIL ")+name);
  if(!ok)failures++;
}
if(failures)process.exit(1);
console.log("[native:generated] generated Android wrapper contract OK");
