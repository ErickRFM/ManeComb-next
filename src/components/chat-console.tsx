"use client";
import { FormEvent, useEffect, useState } from "react";
import { useSocket } from "@/src/hooks/useSocket";
export function ChatConsole(){
  const socket=useSocket(); const [body,setBody]=useState(""); const [messages,setMessages]=useState<any[]>([]);
  useEffect(()=>{const handler=(message:any)=>setMessages((current)=>[...current,message]);socket.on("chat:message",handler);return()=>{socket.off("chat:message",handler)}},[socket]);
  function send(event:FormEvent){event.preventDefault();if(!body.trim())return;socket.emit("chat:message",{channelId:"dispatch",clientMessageId:crypto.randomUUID(),kind:"text",body},(ack:any)=>{if(!ack?.ok)return;setBody("")});}
  return <div className="grid"><div className="card" style={{minHeight:320,maxHeight:420,overflow:"auto"}}>{messages.length?messages.map((m,i)=><p key={m._id||i}>{m.body}</p>):<p className="muted">Sin mensajes todavía.</p>}</div><form className="card" onSubmit={send} style={{display:"flex",gap:8}}><input className="input" value={body} onChange={(e)=>setBody(e.target.value)} placeholder="Mensaje a central"/><button className="btn">Enviar</button></form></div>
}
