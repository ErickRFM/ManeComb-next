"use client";
import { Capacitor, registerPlugin } from "@capacitor/core";

type NativeLocationPlugin = {
  start(options:{serverUrl:string;vehicleId:string;journeyId:string;deviceToken:string}):Promise<{started:boolean}>;
  stop():Promise<{stopped:boolean}>;
  status():Promise<{running:boolean;pendingPackets:number}>;
  appInfo():Promise<{versionName:string;versionCode:number}>;
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
