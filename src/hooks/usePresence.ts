"use client";
import {useEffect,useState} from "react";
import type {Socket} from "socket.io-client";
export function usePresence(socket:Socket){
  const [online,setOnline]=useState<Set<string>|null>(null);
  useEffect(()=>{
    const reset=()=>setOnline(null);
    const snapshot=({onlineUserIds}:{onlineUserIds:string[]})=>setOnline(new Set(onlineUserIds));
    const update=({userId,online:present}:{userId:string;online:boolean})=>setOnline(current=>{
      if(!current)return null;const next=new Set(current);if(present)next.add(userId);else next.delete(userId);return next;
    });
    socket.on("presence:snapshot",snapshot);socket.on("presence:update",update);socket.on("connect",reset);socket.on("disconnect",reset);
    return()=>{socket.off("presence:snapshot",snapshot);socket.off("presence:update",update);socket.off("connect",reset);socket.off("disconnect",reset)};
  },[socket]);
  return online;
}
