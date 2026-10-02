import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";

const root=process.cwd();
const androidDir=join(root,"android");
const serverUrl=process.env.CAPACITOR_SERVER_URL;

if(!serverUrl){
  throw new Error("CAPACITOR_SERVER_URL is required. Use http://10.0.2.2:3000 for emulator or an HTTPS production URL.");
}

const parsed=new URL(serverUrl);
const localHosts=new Set(["localhost","127.0.0.1","10.0.2.2"]);
if(parsed.protocol!=="https:"&&!localHosts.has(parsed.hostname)){
  throw new Error("CAPACITOR_SERVER_URL must use HTTPS outside local/emulator development.");
}


function runCap(...args){
  const result = process.platform === "win32"
    ? spawnSync(
        process.env.ComSpec || "cmd.exe",
        ["/d", "/s", "/c", "npx", "cap", ...args],
        { cwd: root, stdio: "inherit", env: process.env }
      )
    : spawnSync(
        "npx",
        ["cap", ...args],
        { cwd: root, stdio: "inherit", env: process.env }
      );

  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error("Capacitor command failed: " + args.join(" "));
  }
}


if(!existsSync(androidDir))runCap("add","android");
runCap("sync","android");

const rootGradlePath=join(androidDir,"build.gradle");
if(existsSync(rootGradlePath)){
  let rootGradle=readFileSync(rootGradlePath,"utf8");
  if(!rootGradle.includes("org.jetbrains.kotlin:kotlin-gradle-plugin")){
    const androidPlugin=/classpath\s+['"]com\.android\.tools\.build:gradle:[^'"]+['"]/;
    if(!androidPlugin.test(rootGradle))throw new Error("Could not locate Android Gradle plugin classpath.");
    rootGradle=rootGradle.replace(androidPlugin,(line)=>line+"\n        classpath 'org.jetbrains.kotlin:kotlin-gradle-plugin:2.1.20'");
    writeFileSync(rootGradlePath,rootGradle);
  }
}

const appGradlePath=join(androidDir,"app","build.gradle");
if(existsSync(appGradlePath)){
  let appGradle=readFileSync(appGradlePath,"utf8");
  if(!appGradle.includes("kotlin-android")&&!appGradle.includes("org.jetbrains.kotlin.android")){
    appGradle=appGradle.replace(
      /apply plugin:\s*['"]com\.android\.application['"]/,
      (line)=>line+"\napply plugin: 'org.jetbrains.kotlin.android'"
    );
  }
  if(!appGradle.includes("kotlinOptions")){
    appGradle+="\nandroid {\n    kotlinOptions {\n        jvmTarget = '21'\n    }\n}\n";
  }
  writeFileSync(appGradlePath,appGradle);
}

const sourceDir=join(root,"native","android");
const kotlinDir=join(androidDir,"app","src","main","java","com","manecomb","location");
mkdirSync(kotlinDir,{recursive:true});
for(const name of ["ManeCombLocationPlugin.kt","ManeCombLocationService.kt","ManeCombLocationStore.kt","ManeCombSecureStore.kt","ManeCombLocationCredentials.kt","ManeCombLocationCadence.kt"]){
  copyFileSync(join(sourceDir,name),join(kotlinDir,name));
}

const manifestPath=join(androidDir,"app","src","main","AndroidManifest.xml");
let manifest=readFileSync(manifestPath,"utf8");
const permissions=[
  '<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />',
  '<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />',
  '<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />',
  '<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />',
  '<uses-permission android:name="android.permission.FOREGROUND_SERVICE_LOCATION" />',
  '<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />',
  '<uses-permission android:name="android.permission.WAKE_LOCK" />',
  '<uses-permission android:name="android.permission.RECORD_AUDIO" />',
  '<uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />',
  '<uses-permission android:name="android.permission.CAMERA" />',
  '<uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />',
  '<uses-permission android:name="android.permission.BLUETOOTH_SCAN" />'
];
const missing=permissions.filter(line=>!manifest.includes(line.match(/android:name="([^"]+)"/)?.[1]||line));
if(missing.length){
  const opening=manifest.match(/<manifest\b[^>]*>/)?.[0];
  if(!opening)throw new Error("AndroidManifest.xml is missing the <manifest> root element.");
  manifest=manifest.replace(opening,opening+"\n    "+missing.join("\n    "));
}
if(!manifest.includes("com.manecomb.location.ManeCombLocationService")){
  manifest=manifest.replace(
    "</application>",
    '    <service android:name="com.manecomb.location.ManeCombLocationService" android:enabled="true" android:exported="false" android:foregroundServiceType="location" />\n</application>'
  );
}
writeFileSync(manifestPath,manifest);

const activityPath=join(androidDir,"app","src","main","java","com","manecomb","app","MainActivity.java");
mkdirSync(dirname(activityPath),{recursive:true});
writeFileSync(activityPath,`package com.manecomb.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.manecomb.location.ManeCombLocationPlugin;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    registerPlugin(ManeCombLocationPlugin.class);
    super.onCreate(savedInstanceState);
  }
}
`);

const gradlePath=join(androidDir,"app","build.gradle");
if(existsSync(gradlePath)){
  let gradle=readFileSync(gradlePath,"utf8");
  const versionName=process.env.MANECOMB_ANDROID_VERSION_NAME;
  const versionCode=Number(process.env.MANECOMB_ANDROID_VERSION_CODE||0);
  if(versionName)gradle=gradle.replace(/versionName\s+["'][^"']+["']/,`versionName "${versionName}"`);
  if(Number.isInteger(versionCode)&&versionCode>0)gradle=gradle.replace(/versionCode\s+\d+/, `versionCode ${versionCode}`);
  writeFileSync(gradlePath,gradle);
}

console.log("[native] Android wrapper prepared.");
console.log("[native] server:",serverUrl);
console.log("[native] Kotlin bridge:",kotlinDir);
