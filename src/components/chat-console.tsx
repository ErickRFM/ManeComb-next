"use client";
import { FormEvent, useEffect, useState } from "react";
import { useSocket } from "@/src/hooks/useSocket";

export function ChatConsole(){
  const socket=useSocket();
  const [body,setBody]=useState("");
  const [messages,setMessages]=useState<any[]>([]);
  const [state,setState]=useState("Cargando...");
  const channelId="dispatch";

  useEffect(()=>{
    let mounted=true;
    fetch("/api/chat/messages?channelId="+encodeURIComponent(channelId)+"&limit=50")
      .then(async response=>{
        const data=await response.json();
        if(!response.ok)throw new Error(data.error||"No se pudo cargar el chat");
        if(mounted){setMessages(data.messages||[]);setState("Conectado")}
      })
      .catch(error=>mounted&&setState(error.message));

    const join=()=>socket.emit("chat:join",{channelId});
    socket.on("connect",join);
    if(socket.connected)join();
    const handler=(message:any)=>{
      if(message?.channelId!==channelId)return;
      setMessages((current)=>current.some((item)=>String(item._id)===String(message._id))?current:[...current,message]);
    };
    socket.on("chat:message",handler);
    return()=>{
      mounted=false;
      socket.off("connect",join);
      socket.emit("chat:leave",{channelId});
      socket.off("chat:message",handler);
    }
  },[socket]);

  function send(event:FormEvent){
    event.preventDefault();
    if(!body.trim())return;
    const text=body.trim();
    socket.emit("chat:message",{channelId,clientMessageId:crypto.randomUUID(),kind:"text",body:text},(ack:any)=>{
      if(!ack?.ok){setState(ack?.error||"No se pudo enviar");return}
      setBody("");
      setState("Enviado");
    });
  }

  return <div className="grid">
    <div className="status-row"><strong>Central de despacho</strong><span className="muted">{state}</span></div>
    <div className="card" style={{minHeight:320,maxHeight:420,overflow:"auto"}}>
      {messages.length?messages.map((message,index)=><p key={message._id||index}><strong>{message.senderUserId?"• ":""}</strong>{message.body}</p>):<p className="muted">Sin mensajes todavía.</p>}
    </div>
    <form className="card" onSubmit={send} style={{display:"flex",gap:8}}>
      <input className="input" value={body} onChange={(e)=>setBody(e.target.value)} placeholder="Mensaje a central"/>
      <button className="btn">Enviar</button>
    </form>
  </div>
}
