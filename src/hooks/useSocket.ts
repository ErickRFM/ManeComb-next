"use client";
import { useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";

const HEARTBEAT_MS=20_000;

export function useSocketStatus(socket:ReturnType<typeof io>){
  const [status,setStatus]=useState<"connecting"|"connected"|"disconnected">(socket.connected?"connected":"connecting");
  useEffect(()=>{
    const connected=()=>setStatus("connected");
    const disconnected=()=>setStatus("disconnected");
    socket.on("connect",connected);socket.on("disconnect",disconnected);socket.on("connect_error",disconnected);
    setStatus(socket.connected?"connected":"connecting");
    return()=>{socket.off("connect",connected);socket.off("disconnect",disconnected);socket.off("connect_error",disconnected)};
  },[socket]);
  return status;
}

export function useSocket() {
  const socket = useMemo(() => io({
    path: "/socket.io",
    autoConnect: false,
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10_000
  }), []);

  useEffect(() => {
    let timer:ReturnType<typeof setInterval>|null=null;

    const join=()=>{
      socket.emit("presence:join",{},()=>undefined);
      socket.emit("client:heartbeat",{},()=>undefined);
      if(timer)clearInterval(timer);
      timer=setInterval(()=>socket.emit("client:heartbeat",{},()=>undefined),HEARTBEAT_MS);
    };

    const onVisibility=()=>{
      if(document.visibilityState==="visible"&&socket.connected)join();
    };

    const onRevoked=()=>{
      if(timer)clearInterval(timer);
      timer=null;
      socket.disconnect();
      window.location.assign(window.location.pathname.startsWith("/operacion")?"/login?surface=operation":"/login");
    };

    socket.on("connect",join);
    socket.on("session:revoked",onRevoked);
    document.addEventListener("visibilitychange",onVisibility);
    socket.connect();

    return () => {
      if(timer)clearInterval(timer);
      socket.off("connect",join);
      socket.off("session:revoked",onRevoked);
      document.removeEventListener("visibilitychange",onVisibility);
      socket.disconnect();
    };
  }, [socket]);

  return socket;
}
