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
  const executable=process.platform==="win32"?"npx.cmd":"npx";
  const result=spawnSync(executable,["cap",...args],{cwd:root,stdio:"inherit",env:process.env});
  if(result.status!==0)throw new Error("Capacitor command failed: "+args.join(" "));
}

if(!existsSync(androidDir))runCap("add","android");
runCap("sync","android");

const sourceDir=join(root,"native","android");
const kotlinDir=join(androidDir,"app","src","main","java","com","manecomb","location");
mkdirSync(kotlinDir,{recursive:true});
for(const name of ["ManeCombLocationPlugin.kt","ManeCombLocationService.kt","ManeCombLocationStore.kt"]){
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
  const end=manifest.indexOf(">");
  manifest=manifest.slice(0,end+1)+"\n    "+missing.join("\n    ")+manifest.slice(end+1);
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
