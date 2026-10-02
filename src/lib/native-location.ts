"use client";
import { Capacitor, registerPlugin, type PluginListenerHandle } from "@capacitor/core";
import type { NativeTrackingStatus } from "@/src/lib/native-tracking-contract";

type NativeLocationPlugin = {
  start(options:{serverUrl:string;vehicleId:string;journeyId:string;deviceToken:string}):Promise<{started:boolean}>;
  stop():Promise<{stopped:boolean}>;
  status():Promise<NativeTrackingStatus>;
  appInfo():Promise<{versionName:string;versionCode:number}>;
  addListener(eventName:"trackingState",listener:(status:NativeTrackingStatus)=>void):Promise<PluginListenerHandle>;
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
export async function listenNativeLocationStatus(listener:(status:NativeTrackingStatus)=>void){
  return NativeLocation.addListener("trackingState",listener);
}
