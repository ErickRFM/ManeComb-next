"use client";
import { useEffect, useMemo } from "react";
import { io } from "socket.io-client";

export function useSocket() {
  const socket = useMemo(() => io({ path: "/socket.io", autoConnect: false, transports: ["websocket", "polling"] }), []);
  useEffect(() => {
    socket.connect();
    return () => { socket.disconnect(); };
  }, [socket]);
  return socket;
}
