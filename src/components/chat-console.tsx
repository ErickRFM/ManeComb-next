"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useSocket,useSocketStatus } from "@/src/hooks/useSocket";
import { uploadManeCombFile } from "@/src/lib/client-upload";
import {deliverChatMessage,mergeChatMessages,type ChatMessage as Message,type ChatPacket} from "@/src/lib/chat-messages";
import {Icon} from "@/src/components/ui/icon";
import {usePresence} from "@/src/hooks/usePresence";
import {messageTime} from "@/src/components/mobile-ui/communication-presentation";

type ChatUser={id:string;name:string;channel:string;roles:string[]};
type Attachment=Awaited<ReturnType<typeof uploadManeCombFile>>;

function directChannel(self:string,target:string){
  return "direct:"+[self,target].sort().join(":");
}

export function ChatConsole({operation=false}:{operation?:boolean}={}){
  const socket=useSocket();
  const connection=useSocketStatus(socket);
  const onlineUsers=usePresence(socket);
  const scrollRef=useRef<HTMLDivElement|null>(null);
  const fileRef=useRef<HTMLInputElement|null>(null);
  const [self,setSelf]=useState<{id:string;name:string}|null>(null);
  const [users,setUsers]=useState<ChatUser[]>([]);
  const [selected,setSelected]=useState<string|null>(null);
  const [body,setBody]=useState("");
  const [messages,setMessages]=useState<Message[]>([]);
  const [state,setState]=useState("Conectando...");
  const [uploading,setUploading]=useState(false);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const [retry,setRetry]=useState(0);
  const [mobileConversation,setMobileConversation]=useState(false);
  const [pending,setPending]=useState<Array<{packet:ChatPacket;status:"sending"|"failed"}>>([]);
  const inFlight=useRef(new Set<string>());
  const drafts=useRef(new Map<string,string>());

  const target=users.find(user=>user.id===selected)||null;
  const channelId=self&&target?directChannel(self.id,target.id):"dispatch";
  const activeChannel=useRef(channelId);activeChannel.current=channelId;

  useEffect(()=>{
    let mounted=true;
    void Promise.all([
      fetch("/api/auth/session").then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.error||"SESSION_ERROR");return d.user}),
      fetch("/api/chat/users").then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.error||"CHAT_DIRECTORY_ERROR");return d.users||[]})
    ]).then(([user,directory])=>{
      if(!mounted)return;
      setSelf({id:user.id,name:user.name});
      setUsers(directory);
      setError("");
    }).catch(()=>{if(mounted){setLoading(false);setError("No se pudo abrir el chat. Revisa tu conexión o tu acceso.")}});
    return()=>{mounted=false};
  },[retry]);

  useEffect(()=>{
    if(!self)return;
    let mounted=true;
    setState("Cargando conversación...");
    setLoading(true);setError("");
    setMessages([]);
    const query=new URLSearchParams({channelId,limit:"60"});
    if(target)query.set("recipientUserId",target.id);

    const load=()=>void fetch("/api/chat/messages?"+query.toString(),{cache:"no-store"}).then(async response=>{
      const data=await response.json();
      if(!response.ok)throw new Error(data.error||"No se pudo cargar el chat");
      if(mounted){setMessages(current=>mergeChatMessages(current,data.messages||[]));setState("");setError("")}
    }).catch(()=>mounted&&setError("No se pudo cargar el historial. Vuelve a intentar."))
      .finally(()=>mounted&&setLoading(false));
    load();

    const join=()=>{socket.emit("chat:join",{channelId});load()};
    socket.on("connect",join);
    if(socket.connected)join();
    const handler=(message:Message)=>{
      if(message?.channelId!==channelId)return;
      setMessages(current=>mergeChatMessages(current,[message]));
      if(message.senderUserId===self.id)setPending(current=>current.filter(item=>item.packet.clientMessageId!==message.clientMessageId));
    };
    socket.on("chat:message",handler);

    return()=>{
      mounted=false;
      socket.off("connect",join);
      socket.emit("chat:leave",{channelId});
      socket.off("chat:message",handler);
    };
  },[socket,self,channelId,target?.id,retry]);

  useEffect(()=>{
    scrollRef.current?.scrollTo({top:scrollRef.current.scrollHeight,behavior:operation&&window.matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth"});
  },[messages,operation]);

  async function deliver(packet:ChatPacket){
    const id=packet.clientMessageId!;if(inFlight.current.has(id))return;
    inFlight.current.add(id);setPending(current=>current.map(item=>item.packet.clientMessageId===id?{packet,status:"sending"}:item));
    try{
      const message=await deliverChatMessage(socket,packet);
      setPending(current=>current.filter(item=>item.packet.clientMessageId!==id));
      if(activeChannel.current===packet.channelId){setMessages(current=>mergeChatMessages(current,[message]));setState("Enviado")}
    }catch{
      setPending(current=>current.map(item=>item.packet.clientMessageId===id?{packet,status:"failed"}:item));
      if(activeChannel.current===packet.channelId)setState("No se confirmó el envío. Puedes reintentar.");
    }finally{inFlight.current.delete(id)}
  }

  function sendPayload(payload:{kind:"text"|"image";body:string;attachment?:Attachment}){
    if(!self||!socket.connected){setState("Sin conexión. El borrador se conserva.");return false}
    if(pending.length>=20){setState("Reintenta los mensajes pendientes antes de enviar más.");return false}
    const packet:ChatPacket={
      channelId,
      clientMessageId:crypto.randomUUID(),
      recipientUserId:target?.id,
      kind:payload.kind,
      body:payload.body,
      attachment:payload.attachment
    };
    setPending(current=>[...current,{packet,status:"sending"}]);void deliver(packet);return true;
  }

  function send(event:FormEvent){
    event.preventDefault();
    const text=body.trim();
    if(!text)return;
    if(sendPayload({kind:"text",body:text})){setBody("");drafts.current.delete(channelId)}
  }

  async function attach(file:File){
    if(!socket.connected){setState("Conecta para adjuntar una imagen.");return}
    setUploading(true);
    setState("Subiendo imagen...");
    try{
      const uploaded=await uploadManeCombFile(file,"chat");
      // The original recipient is retained even if navigation changes during upload.
      const packet:ChatPacket={channelId,clientMessageId:crypto.randomUUID(),recipientUserId:target?.id,kind:"image",body:"",attachment:uploaded};
      setPending(current=>[...current,{packet,status:"sending"}]);void deliver(packet);
    }catch(error){setState(error instanceof Error?error.message:"No se pudo adjuntar")}
    finally{setUploading(false);if(fileRef.current)fileRef.current.value=""}
  }

  const conversationTitle=target?.name||"Central de despacho";
  const conversationMeta=target?(target.channel==="mobile_operations"?"Conductor":"Portal / operación"):"Canal general operativo";
  function choose(id:string|null){
    drafts.current.set(channelId,body);setSelected(id);setMobileConversation(true);
    setBody(drafts.current.get(self&&id?directChannel(self.id,id):"dispatch")||"");
  }

  const orderedUsers=useMemo(()=>[...users].sort((a,b)=>{
    if(a.channel!==b.channel)return a.channel==="company_portal"?-1:1;
    return a.name.localeCompare(b.name);
  }),[users]);

  return <div className={"chat-shell "+(mobileConversation?"conversation-open":"")+(operation?" mobile-v3-chat":"")}>
    <aside className="chat-directory">
      <div className="chat-directory-head"><div><strong>{operation?"Directorio":"Mensajes"}</strong><small>{self?operation?users.length:users.length+1:"—"} {operation?"personas":"conversaciones"}</small></div><span className="live-badge">{connection==="connected"?"En línea":"Reconectando"}</span></div>
      {error?<p role="alert">{error} <button className="btn secondary" onClick={()=>setRetry(value=>value+1)}>Reintentar chat</button></p>:null}
      <button className={"conversation-row "+(!selected?"active":"")} onClick={()=>choose(null)} disabled={!self}>
        <span className="conversation-avatar brand-avatar">MC</span><span className="conversation-copy"><strong>Central de despacho</strong><small>Canal operativo general</small></span>
      </button>
      <div className="conversation-divider">PERSONAS</div>
      <div className="conversation-list">
        {orderedUsers.map(user=><button key={user.id} className={"conversation-row "+(selected===user.id?"active":"")} onClick={()=>choose(user.id)}>
          <span className="conversation-avatar">{user.name.split(/\s+/).slice(0,2).map(part=>part[0]).join("").toUpperCase()}</span>
          <span className="conversation-copy"><strong>{user.name}</strong><small>{user.channel==="mobile_operations"?"Conductor":"Portal"}</small></span>
          {onlineUsers?.has(user.id)?<span className="presence-dot" aria-label="En línea"/>:null}
        </button>)}
      </div>
    </aside>

    <section className="chat-conversation">
      <header className="chat-header">
        <button type="button" className="chat-back icon-action" aria-label="Volver a conversaciones" onClick={()=>setMobileConversation(false)}><Icon name="back"/></button>
        <div className="chat-person"><span className="conversation-avatar">{target?target.name.split(/\s+/).slice(0,2).map(part=>part[0]).join("").toUpperCase():"MC"}</span><div><strong>{conversationTitle}</strong><small>{conversationMeta}</small></div></div>
        <span className="chat-state" role="status">{state|| (connection==="connected"?"En línea":connection==="connecting"?"Conectando…":"Reconectando")}</span>
      </header>

      <div className="chat-messages" ref={scrollRef} role="log" aria-label="Mensajes" aria-live="polite" aria-busy={loading} tabIndex={operation?0:undefined}>
        {error?<button className="btn secondary" onClick={()=>setRetry(value=>value+1)}>Reintentar historial</button>:null}
        {!messages.length?<div className="chat-empty"><Icon name="chat"/><strong>{loading?"Cargando conversación…":error?"Historial no disponible":"Comienza la conversación"}</strong><p>{error||"Los mensajes enviados se guardan y se sincronizan en tiempo real."}</p></div>:messages.map((message,index)=>{
          const own=String(message.senderUserId)===String(self?.id);
          const imageUrl=message.attachment&&message._id?"/api/chat/messages/"+message._id+"/attachment":message.body;
          return <div className={"message-row "+(own?"own":"")} key={message._id||message.clientMessageId||index}>
            {!own?<span className="message-avatar">{target?target.name.charAt(0).toUpperCase():"C"}</span>:null}
            <div className={"message-bubble "+(own?"own":"")}>
              {message.kind==="image"?<a href={imageUrl} target="_blank" rel="noreferrer"><img className="message-image" src={imageUrl} alt="Adjunto del chat"/></a>:<p>{message.body}</p>}
              <small>{operation?messageTime(message.createdAt):message.createdAt?new Date(message.createdAt).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}):"ahora"}{own?" · enviado":""}</small>
            </div>
          </div>;
        })}
        {pending.filter(item=>item.packet.channelId===channelId).map(item=><div className="message-row own" key={item.packet.clientMessageId}><div className="message-bubble own"><p>{item.packet.body||"Imagen adjunta"}</p><small>{item.status==="sending"?"Enviando…":"Envío sin confirmar"}</small>{item.status==="failed"?<button className="btn secondary" disabled={!socket.connected} onClick={()=>void deliver(item.packet)}>Reintentar envío</button>:null}</div></div>)}
      </div>

      <form className="chat-composer" onSubmit={send}>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={e=>{const file=e.target.files?.[0];if(file)void attach(file)}}/>
        <button type="button" className="composer-action" onClick={()=>fileRef.current?.click()} disabled={uploading||!self||connection!=="connected"||pending.length>=20} aria-label="Adjuntar imagen">＋</button>
        <input value={body} onChange={e=>setBody(e.target.value)} placeholder={"Mensaje a "+conversationTitle} aria-label="Mensaje"/>
        <button className="composer-send" disabled={!body.trim()||uploading||!self||connection!=="connected"||pending.length>=20}>Enviar</button>
      </form>
    </section>
  </div>;
}
