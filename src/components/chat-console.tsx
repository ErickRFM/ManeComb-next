"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useSocket } from "@/src/hooks/useSocket";
import { uploadManeCombFile } from "@/src/lib/client-upload";

type ChatMessage = {
  _id?: string;
  clientMessageId?: string;
  kind?: "text" | "image" | "system";
  body?: string;
  attachment?: { url: string; fileName?: string };
};

function messageKey(message:ChatMessage,index:number){
  return String(message._id||message.clientMessageId||index);
}

export function ChatConsole(){
  const socket=useSocket();
  const [body,setBody]=useState("");
  const [messages,setMessages]=useState<ChatMessage[]>([]);
  const [state,setState]=useState("");
  const [busy,setBusy]=useState(false);
  const fileRef=useRef<HTMLInputElement|null>(null);

  useEffect(()=>{
    let mounted=true;
    fetch("/api/chat/messages?channelId=dispatch&limit=100")
      .then(async response=>{
        const data=await response.json();
        if(!response.ok)throw new Error(data.error||"No se pudo cargar el historial");
        if(mounted)setMessages(data.messages||[]);
      })
      .catch(error=>mounted&&setState(error.message));

    const handler=(message:ChatMessage)=>setMessages((current)=>{
      const id=String(message._id||message.clientMessageId||"");
      if(id&&current.some((item)=>String(item._id||item.clientMessageId||"")===id))return current;
      return [...current,message];
    });
    socket.on("chat:message",handler);
    return()=>{mounted=false;socket.off("chat:message",handler)}
  },[socket]);

  async function send(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    const file=fileRef.current?.files?.[0];
    if(!body.trim()&&!file)return;
    setBusy(true);
    setState(file?"Cargando imagen...":"Enviando...");
    try{
      const attachment=file?await uploadManeCombFile(file,"chat"):undefined;
      const payload={
        channelId:"dispatch",
        clientMessageId:crypto.randomUUID(),
        kind:attachment?"image":"text",
        body:body.trim(),
        ...(attachment?{attachment}: {})
      };
      const ack=await new Promise<any>((resolve)=>socket.emit("chat:message",payload,resolve));
      if(!ack?.ok)throw new Error(ack?.error||"No se pudo enviar");
      setBody("");
      if(fileRef.current)fileRef.current.value="";
      setState("");
    }catch(error){
      setState(error instanceof Error?error.message:"No se pudo enviar");
    }finally{
      setBusy(false);
    }
  }

  return <div className="grid">
    <div className="card" style={{minHeight:320,maxHeight:460,overflow:"auto"}}>
      {messages.length?messages.map((message,index)=><div key={messageKey(message,index)} style={{marginBottom:14}}>
        {message.kind==="image"&&message.attachment?.url?<img src={message.attachment.url} alt={message.attachment.fileName||"Adjunto"} style={{display:"block",maxWidth:"min(100%,360px)",borderRadius:12,marginBottom:6}}/>:null}
        {message.body?<p style={{margin:0}}>{message.body}</p>:null}
      </div>):<p className="muted">Sin mensajes todavía.</p>}
    </div>
    <form className="card grid" onSubmit={send}>
      <input className="input" value={body} onChange={(event)=>setBody(event.target.value)} placeholder="Mensaje a central"/>
      <input ref={fileRef} className="input" type="file" accept="image/jpeg,image/png,image/webp"/>
      <button className="btn" disabled={busy}>{busy?"Enviando...":"Enviar"}</button>
      {state?<p className="muted" style={{margin:0}}>{state}</p>:null}
    </form>
  </div>
}
