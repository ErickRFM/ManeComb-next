"use client";
import { useState } from "react";
import { useSocket } from "@/src/hooks/useSocket";
export function RadioConsole(){
  const socket=useSocket(); const [channelId,setChannelId]=useState("general"); const [state,setState]=useState("Listo");
  function press(){socket.emit("radio:request-floor",{channelId},(ack:any)=>setState(ack?.ok?"Hablando":"Canal ocupado"));}
  function release(){socket.emit("radio:release-floor",{channelId});setState("Escuchando");}
  return <div className="card grid"><input className="input" value={channelId} onChange={(e)=>setChannelId(e.target.value)} placeholder="Canal"/><button className="btn" style={{minHeight:140,fontSize:28}} onPointerDown={press} onPointerUp={release} onPointerCancel={release}>MANTÉN PARA HABLAR</button><strong>{state}</strong><p className="muted">El control de piso vive en el servidor para evitar colisiones entre conductores.</p></div>
}
