import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { resolve } from "node:path";

function read(path){return existsSync(path)?readFileSync(path,"utf8"):"";}
function match(text,regex){return text.match(regex)?.[1]??null}

const variables=read("android/variables.gradle");
const appGradle=read("android/app/build.gradle");
const rootGradle=read("android/build.gradle");
const manifest=read("android/app/src/main/AndroidManifest.xml");
const apk="android/app/build/outputs/apk/debug/app-debug.apk";
const gitSha=execFileSync("git",["rev-parse","HEAD"],{encoding:"utf8"}).trim();
const sourceChanged=execFileSync("git",["status","--porcelain","--untracked-files=normal"],{encoding:"utf8"}).trim().length>0;
const capacitor=JSON.parse(read("android/app/src/main/assets/capacitor.config.json")||"{}");
const server=capacitor.server?.url?new URL(capacitor.server.url):null;

const report={
  generatedAt:new Date().toISOString(),
  gitSha,
  sourceChanged,
  apkPath:resolve(apk),
  apkSha256:existsSync(apk)?createHash("sha256").update(readFileSync(apk)).digest("hex"):null,
  serverOrigin:server?.origin??null,
  serverPath:server?.pathname??null,
  compileSdk:match(variables,/compileSdkVersion\s*=\s*(\d+)/),
  targetSdk:match(variables,/targetSdkVersion\s*=\s*(\d+)/),
  minSdk:match(variables,/minSdkVersion\s*=\s*(\d+)/),
  versionCode:match(appGradle,/versionCode\s+(\d+)/),
  versionName:match(appGradle,/versionName\s+["']([^"']+)["']/),
  androidGradlePlugin:match(rootGradle,/com\.android\.tools\.build:gradle:([^'"]+)/),
  kotlinGradlePlugin:match(rootGradle,/org\.jetbrains\.kotlin:kotlin-gradle-plugin:([^'"]+)/),
  foregroundLocationService:manifest.includes('android:foregroundServiceType="location"'),
  permissions:[...manifest.matchAll(/<uses-permission[^>]+android:name="([^"]+)"/g)].map(match=>match[1]),
  apkBytes:existsSync(apk)?statSync(apk).size:null
};

mkdirSync("artifacts/android-smoke",{recursive:true});
writeFileSync("artifacts/android-smoke/native-build.json",JSON.stringify(report,null,2)+"\n");
console.log(JSON.stringify(report,null,2));
