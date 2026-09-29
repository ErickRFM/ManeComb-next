"use client";
import { Capacitor, registerPlugin } from "@capacitor/core";
type NativeLocationPlugin = {
  start(options:{serverUrl:string;vehicleId:string;journeyId?:string}):Promise<{started:boolean}>;
  stop():Promise<{stopped:boolean}>;
  status():Promise<{running:boolean}>;
};
const NativeLocation = registerPlugin<NativeLocationPlugin>("ManeCombLocation");
export function isNativeLocationAvailable(){ return Capacitor.isNativePlatform(); }
export async function startNativeLocation(options:{serverUrl:string;vehicleId:string;journeyId?:string}){ return NativeLocation.start(options); }
export async function stopNativeLocation(){ return NativeLocation.stop(); }
