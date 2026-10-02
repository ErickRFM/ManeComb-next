"use client";
import { Capacitor, registerPlugin } from "@capacitor/core";

export type NativeLocationStatus = {
  contractVersion:number;
  state:string;
  running:boolean;
  pendingPackets:number;
  networkAvailable:boolean;
  lastCaptureAtMs:number;
  lastUploadAtMs:number;
  retryDelayMs:number;
  lastError:string;
};

type NativeLocationPlugin = {
  start(options:{serverUrl:string;vehicleId:string;journeyId:string;deviceToken:string}):Promise<{started:boolean;contractVersion:number}>;
  stop():Promise<{stopped:boolean;contractVersion:number}>;
  status():Promise<NativeLocationStatus>;
  appInfo():Promise<{versionName:string;versionCode:number;nativeTrackingContractVersion:number}>;
};

const NativeLocation = registerPlugin<NativeLocationPlugin>("ManeCombLocation");

export function isNativeLocationAvailable(){ return Capacitor.isNativePlatform(); }

export async function startNativeLocation(options:{serverUrl:string;vehicleId:string;journeyId?:string}){
  if(!options.journeyId) throw new Error("journeyId is required for native GPS");
  const response=await fetch("/api/auth/device-session",{
    method:"POST",
    headers:{"content-type":"application/json"},
    body:JSON.stringify({vehicleId:options.vehicleId,journeyId:options.journeyId})
  });
  const data=await response.json().catch(()=>({}));
  if(!response.ok) throw new Error(data.error||"Could not create native GPS session");
  return NativeLocation.start({
    serverUrl:options.serverUrl,
    vehicleId:options.vehicleId,
    journeyId:options.journeyId,
    deviceToken:data.token
  });
}

export async function stopNativeLocation(){ return NativeLocation.stop(); }
export async function getNativeLocationStatus(){ return NativeLocation.status(); }
export async function getNativeAppInfo(){ return NativeLocation.appInfo(); }
