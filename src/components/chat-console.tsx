"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useSocket } from "@/src/hooks/useSocket";
import { uploadManeCombFile } from "@/src/lib/client-upload";

type ChatUser={id:string;name:string;channel:string;roles:string[]};
type Attachment=Awaited<ReturnType<typeof uploadManeCombFile>>;
type Message={_id?:string;senderUserId?:string;recipientUserId?:string|null;channelId:string;kind:"text"|"image";body:string;attachment?:Attachment;createdAt?:string;clientMessageId?:string};

function directChannel(self:string,target:string){
  return "direct:"+[self,target].sort().join(":");
}

export function ChatConsole(){
  const socket=useSocket();
  const scrollRef=useRef<HTMLDivElement|null>(null);
  const fileRef=useRef<HTMLInputElement|null>(null);
  const [self,setSelf]=useState<{id:string;name:string}|null>(null);
  const [users,setUsers]=useState<ChatUser[]>([]);
  const [selected,setSelected]=useState<string|null>(null);
  const [body,setBody]=useState("");
  const [messages,setMessages]=useState<Message[]>([]);
  const [state,setState]=useState("Conectando...");
  const [uploading,setUploading]=useState(false);

  const target=users.find(user=>user.id===selected)||null;
  const channelId=self&&target?directChannel(self.id,target.id):"dispatch";

  useEffect(()=>{
    let mounted=true;
    void Promise.all([
      fetch("/api/auth/session").then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.error||"SESSION_ERROR");return d.user}),
      fetch("/api/chat/users").then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.error||"CHAT_DIRECTORY_ERROR");return d.users||[]})
    ]).then(([user,directory])=>{
      if(!mounted)return;
      setSelf({id:user.id,name:user.name});
      setUsers(directory);
    }).catch(e=>mounted&&setState(e.message));
    return()=>{mounted=false};
  },[]);

  useEffect(()=>{
    if(!self)return;
    let mounted=true;
    setState("Cargando conversación...");
    setMessages([]);
    const query=new URLSearchParams({channelId,limit:"60"});
    if(target)query.set("recipientUserId",target.id);

    fetch("/api/chat/messages?"+query.toString()).then(async response=>{
      const data=await response.json();
      if(!response.ok)throw new Error(data.error||"No se pudo cargar el chat");
      if(mounted){setMessages(data.messages||[]);setState("En línea")}
    }).catch(error=>mounted&&setState(error.message));

    const join=()=>socket.emit("chat:join",{channelId});
    socket.on("connect",join);
    if(socket.connected)join();
    const handler=(message:Message)=>{
      if(message?.channelId!==channelId)return;
      setMessages(current=>current.some(item=>String(item._id||item.clientMessageId)===String(message._id||message.clientMessageId))?current:[...current,message]);
    };
    socket.on("chat:message",handler);

    return()=>{
      mounted=false;
      socket.off("connect",join);
      socket.emit("chat:leave",{channelId});
      socket.off("chat:message",handler);
    };
  },[socket,self,channelId,target?.id]);

  useEffect(()=>{
    scrollRef.current?.scrollTo({top:scrollRef.current.scrollHeight,behavior:"smooth"});
  },[messages]);

  function sendPayload(payload:{kind:"text"|"image";body:string;attachment?:Attachment}){
    if(!self)return;
    const clientMessageId=crypto.randomUUID();
    socket.emit("chat:message",{
      channelId,
      clientMessageId,
      recipientUserId:target?.id,
      kind:payload.kind,
      body:payload.body,
      attachment:payload.attachment
    },(ack:any)=>{
      if(!ack?.ok){setState(ack?.error||"No se pudo enviar");return}
      if(ack.message)setMessages(current=>current.some(item=>String(item._id)===String(ack.message._id))?current:[...current,ack.message]);
      setState("Enviado");
    });
  }

  function send(event:FormEvent){
    event.preventDefault();
    const text=body.trim();
    if(!text)return;
    sendPayload({kind:"text",body:text});
    setBody("");
  }

  async function attach(file:File){
    setUploading(true);
    setState("Subiendo imagen...");
    try{
      const uploaded=await uploadManeCombFile(file,"chat");
      sendPayload({kind:"image",body:"",attachment:uploaded});
    }catch(error){setState(error instanceof Error?error.message:"No se pudo adjuntar")}
    finally{setUploading(false);if(fileRef.current)fileRef.current.value=""}
  }

  const conversationTitle=target?.name||"Central de despacho";
  const conversationMeta=target?(target.channel==="mobile_operations"?"Conductor":"Portal / operación"):"Canal general operativo";

  const orderedUsers=useMemo(()=>[...users].sort((a,b)=>{
    if(a.channel!==b.channel)return a.channel==="company_portal"?-1:1;
    return a.name.localeCompare(b.name);
  }),[users]);

  return <div className="chat-shell">
    <aside className="chat-directory">
      <div className="chat-directory-head"><div><strong>Mensajes</strong><small>{users.length+1} conversaciones</small></div><span className="live-badge"><span className="live-dot"/>Live</span></div>
      <button className={"conversation-row "+(!selected?"active":"")} onClick={()=>setSelected(null)}>
        <span className="conversation-avatar brand-avatar">MC</span><span className="conversation-copy"><strong>Central de despacho</strong><small>Canal operativo general</small></span>
      </button>
      <div className="conversation-divider">PERSONAS</div>
      <div className="conversation-list">
        {orderedUsers.map(user=><button key={user.id} className={"conversation-row "+(selected===user.id?"active":"")} onClick={()=>setSelected(user.id)}>
          <span className="conversation-avatar">{user.name.split(/\s+/).slice(0,2).map(part=>part[0]).join("").toUpperCase()}</span>
          <span className="conversation-copy"><strong>{user.name}</strong><small>{user.channel==="mobile_operations"?"Conductor":"Portal"}</small></span>
          <span className="presence-dot"/>
        </button>)}
      </div>
    </aside>

    <section className="chat-conversation">
      <header className="chat-header">
        <div className="chat-person"><span className="conversation-avatar">{target?target.name.split(/\s+/).slice(0,2).map(part=>part[0]).join("").toUpperCase():"MC"}</span><div><strong>{conversationTitle}</strong><small>{conversationMeta}</small></div></div>
        <span className="chat-state">{state}</span>
      </header>

      <div className="chat-messages" ref={scrollRef}>
        {!messages.length?<div className="chat-empty"><span>▤</span><strong>Comienza la conversación</strong><p>Los mensajes se guardan y se sincronizan en tiempo real.</p></div>:messages.map((message,index)=>{
          const own=String(message.senderUserId)===String(self?.id);
          const imageUrl=message.attachment&&message._id?"/api/chat/messages/"+message._id+"/attachment":message.body;
          return <div className={"message-row "+(own?"own":"")} key={message._id||message.clientMessageId||index}>
            {!own?<span className="message-avatar">{target?target.name.charAt(0).toUpperCase():"C"}</span>:null}
            <div className={"message-bubble "+(own?"own":"")}>
              {message.kind==="image"?<a href={imageUrl} target="_blank" rel="noreferrer"><img className="message-image" src={imageUrl} alt="Adjunto del chat"/></a>:<p>{message.body}</p>}
              <small>{message.createdAt?new Date(message.createdAt).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}):"ahora"}{own?" · enviado":""}</small>
            </div>
          </div>;
        })}
      </div>

      <form className="chat-composer" onSubmit={send}>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={e=>{const file=e.target.files?.[0];if(file)void attach(file)}}/>
        <button type="button" className="composer-action" onClick={()=>fileRef.current?.click()} disabled={uploading} aria-label="Adjuntar imagen">＋</button>
        <input value={body} onChange={e=>setBody(e.target.value)} placeholder={"Mensaje a "+conversationTitle} aria-label="Mensaje"/>
        <button className="composer-send" disabled={!body.trim()||uploading}>Enviar</button>
      </form>
    </section>
  </div>;
}
