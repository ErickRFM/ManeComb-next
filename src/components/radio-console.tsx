"use client";

import { useEffect, useRef, useState } from "react";
import { useSocket,useSocketStatus } from "@/src/hooks/useSocket";
import {Icon} from "@/src/components/ui/icon";
import {usePresence} from "@/src/hooks/usePresence";

function blobToDataUrl(blob:Blob){
  return new Promise<string>((resolve,reject)=>{
    const reader=new FileReader();
    reader.onload=()=>resolve(String(reader.result));
    reader.onerror=()=>reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export function RadioConsole(){
  const socket=useSocket();
  const connection=useSocketStatus(socket),online=usePresence(socket);
  const [users,setUsers]=useState<Array<{id:string;name:string}>>([]),[blockedAudio,setBlockedAudio]=useState<string|null>(null);
  const attemptRef=useRef(0);
  const [channelId,setChannelId]=useState("general");
  const [retry,setRetry]=useState(0);
  const [state,setState]=useState<"connecting"|"listening"|"requesting"|"talking"|"finishing"|"busy"|"error">("connecting");
  const [speaker,setSpeaker]=useState<string|null>(null);
  const [lastRx,setLastRx]=useState<Date|null>(null);
  const recorderRef=useRef<MediaRecorder|null>(null);
  const streamRef=useRef<MediaStream|null>(null);
  const pressedRef=useRef(false);
  useEffect(()=>{let active=true;void fetch("/api/chat/users").then(async response=>response.ok?response.json():null).then(data=>{if(active)setUsers(data?.users||[])}).catch(()=>undefined);return()=>{active=false}},[]);

  useEffect(()=>{
    setState("connecting");
    let disposed=false;
    const join=()=>socket.timeout(5000).emit("radio:join",{channelId},(error:Error|null,ack:any)=>{if(!disposed)setState(!error&&ack?.ok?"listening":"error")});
    socket.on("connect",join);
    if(socket.connected)join();
    const play=({channelId:incomingChannel,chunk}:{channelId:string;chunk:string})=>{
      if(incomingChannel!==channelId)return;
      setLastRx(new Date());
      const audio=new Audio(chunk);
      void audio.play().catch(()=>setBlockedAudio(chunk));
    };
    const lost=({channelId:lostChannel}:{channelId:string})=>{
      if(lostChannel===channelId){cancel();setState("busy");setSpeaker(null)}
    };
    const floor=({channelId:floorChannel,userId,active}:{channelId:string;userId:string;active:boolean})=>{
      if(floorChannel!==channelId)return;
      setSpeaker(active?userId:null);
      if(!recorderRef.current)setState(current=>active?"busy":current==="error"?"error":"listening");
    };
    socket.on("radio:audio",play);
    socket.on("radio:floor-lost",lost);
    socket.on("radio:floor",floor);
    const disconnected=()=>{cancel();setState("connecting")};
    socket.on("disconnect",disconnected);
    socket.on("connect_error",disconnected);
    const hidden=()=>{if(document.visibilityState!=="visible")release()};
    document.addEventListener("visibilitychange",hidden);window.addEventListener("blur",release);
    return()=>{
      disposed=true;attemptRef.current++;
      pressedRef.current=false;
      if(recorderRef.current?.state==="recording")recorderRef.current.stop();
      streamRef.current?.getTracks().forEach(track=>track.stop());
      recorderRef.current=null;streamRef.current=null;
      socket.emit("radio:release-floor",{channelId});
      socket.off("disconnect",disconnected);
      socket.off("connect_error",disconnected);
      document.removeEventListener("visibilitychange",hidden);window.removeEventListener("blur",release);
      socket.off("connect",join);
      socket.emit("radio:leave",{channelId});
      socket.off("radio:audio",play);
      socket.off("radio:floor-lost",lost);
      socket.off("radio:floor",floor);
    };
  },[socket,channelId,retry]);

  async function press(){
    if(!socket.connected||recorderRef.current||pressedRef.current||state!=="listening")return;
    const attempt=++attemptRef.current;
    pressedRef.current=true;
    setState("requesting");
    const granted=await new Promise<boolean>(resolve=>{
      const timer=setTimeout(()=>resolve(false),5000);
      socket.emit("radio:request-floor",{channelId},(ack:any)=>{clearTimeout(timer);resolve(Boolean(ack?.ok))});
    });
    if(attempt!==attemptRef.current||!pressedRef.current){if(granted&&!pressedRef.current)socket.emit("radio:release-floor",{channelId});return}
    if(!granted){pressedRef.current=false;setState("error");return}

    let decoder:AudioContext|null=null;
    try{
      const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}});
      if(attempt!==attemptRef.current||!pressedRef.current){stream.getTracks().forEach(track=>track.stop());return}
      streamRef.current=stream;
      const audioDecoder=decoder=new AudioContext();
      const mimeType=MediaRecorder.isTypeSupported("audio/webm;codecs=opus")?"audio/webm;codecs=opus":"audio/webm";
      let pending=Promise.resolve(),deliveryFailed=false;
      const startSegment=()=>{
      const recorder=new MediaRecorder(stream,{mimeType,audioBitsPerSecond:24000});
      let timer:ReturnType<typeof setTimeout>;
      recorder.ondataavailable=event=>{
        if(event.data.size===0)return;
        pending=pending.then(async()=>{
          if(deliveryFailed||attempt!==attemptRef.current||!socket.connected)return;
          const audio=await audioDecoder.decodeAudioData(await event.data.arrayBuffer()).catch(()=>null);
          // A segment stopped before the first audio sample can contain only
          // container headers. Do not send an unplayable empty tail.
          if(!audio||audio.duration===0){if(pressedRef.current)deliveryFailed=true;return}
          const chunk=await blobToDataUrl(event.data);
          if(attempt!==attemptRef.current||!socket.connected)return;
          await new Promise<void>((resolve,reject)=>socket.timeout(5000).emit("radio:audio",{channelId,chunk},(error:Error|null,ack:any)=>!error&&ack?.ok?resolve():reject(new Error("RADIO_AUDIO_ERROR"))));
        }).catch(()=>{deliveryFailed=true});
      };
      recorder.onstop=()=>{
        clearTimeout(timer);
        if(attempt!==attemptRef.current){void pending.finally(()=>audioDecoder.close().catch(()=>undefined));return}
        if(pressedRef.current&&socket.connected&&!deliveryFailed){
          try{startSegment();return}catch{deliveryFailed=true;recorderRef.current=recorder}
        }
        pressedRef.current=false;
        stream.getTracks().forEach(track=>track.stop());
        void pending.finally(async()=>{
          await audioDecoder.close().catch(()=>undefined);
          if(attempt!==attemptRef.current||recorderRef.current!==recorder)return;
          recorderRef.current=null;streamRef.current=null;
          if(socket.connected)socket.emit("radio:release-floor",{channelId});
          setState(socket.connected?(deliveryFailed?"error":"listening"):"connecting");
        });
      };
      recorder.onerror=()=>{cancel();setState("error")};
      recorderRef.current=recorder;
      // Each complete recording is independently playable by the existing
      // receiver. Timeslice fragments do not carry independent WebM headers.
      recorder.start();
      timer=setTimeout(()=>{if(recorder.state==="recording")recorder.stop()},300);
      };
      startSegment();
      setState("talking");
    }catch{
      void decoder?.close().catch(()=>undefined);
      if(attempt!==attemptRef.current)return;
      streamRef.current?.getTracks().forEach(track=>track.stop());streamRef.current=null;recorderRef.current=null;
      pressedRef.current=false;
      socket.emit("radio:release-floor",{channelId});
      setState("error");
    }
  }

  function cancel(){
    attemptRef.current++;
    pressedRef.current=false;
    if(recorderRef.current?.state==="recording")recorderRef.current.stop();
    streamRef.current?.getTracks().forEach(track=>track.stop());
    recorderRef.current=null;streamRef.current=null;
    if(socket.connected)socket.emit("radio:release-floor",{channelId});
    setState(socket.connected?"listening":"connecting");
  }
  function release(){
    pressedRef.current=false;
    const recorder=recorderRef.current;
    if(!recorder){if(state!=="error")cancel();return}
    // Stop capture immediately; keep this recording valid until its final
    // dataavailable event is acknowledged, then surrender the floor.
    setState("finishing");
    if(recorder.state==="recording")recorder.stop();
    streamRef.current?.getTracks().forEach(track=>track.stop());
  }

  const copy={
    connecting:["Conectando","Preparando canal"],
    listening:["Listo para transmitir","Mantén presionado para hablar"],
    requesting:["Solicitando turno","Esperando disponibilidad"],
    talking:["Transmitiendo","Suelta para escuchar"],
    finishing:["Terminando transmisión","Entregando último fragmento"],
    busy:["Canal ocupado",speaker?"Otro usuario está hablando":"Espera un momento"],
    error:["Radio no disponible","Revisa micrófono o conexión"]
  }[state];

  return <div className="radio-console">
    <div className="radio-console-head">
      <div><span className="eyebrow">RADIO PTT</span><h3>Canal operativo</h3></div>
      <select value={channelId} disabled={state==="talking"||state==="requesting"||state==="finishing"} onChange={e=>setChannelId(e.target.value)} className="radio-channel-select" aria-label="Canal de radio">
        <option value="general">General</option>
        <option value="dispatch">Despacho</option>
        <option value="emergencias">Emergencias</option>
      </select>
    </div>

    <div className={"ptt-stage "+state}>
      <div className="ptt-wave" aria-hidden="true">{Array.from({length:12}).map((_,index)=><span key={index}/>)}</div>
      <div className="ptt-orbit">
        <button className="ptt-button" disabled={connection!=="connected"||state==="connecting"||state==="busy"||state==="error"} onPointerDown={event=>{event.currentTarget.setPointerCapture(event.pointerId);void press()}} onPointerUp={release} onPointerCancel={release} onKeyDown={event=>{if((event.key===" "||event.key==="Enter")&&!event.repeat){event.preventDefault();void press()}}} onKeyUp={event=>{if(event.key===" "||event.key==="Enter"){event.preventDefault();release()}}} onBlur={release}>
          <span className="ptt-mic"><Icon name="radio" size={32}/></span>
          <strong>{state==="talking"?"HABLANDO":"PULSA Y HABLA"}</strong>
          <small>{state==="talking"?"Suelta para terminar":"Mantén presionado"}</small>
        </button>
      </div>
    </div>

    <div className="radio-state-card" role="status">
      <span className={"radio-state-dot "+state}/>
      <div><strong>{copy[0]}</strong><small>{copy[1]}</small></div>
      <span className="radio-last">{lastRx?"Última RX "+lastRx.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}):"Sin RX reciente"}</span>
    </div>
    {state==="error"?<button className="btn secondary" onClick={()=>setRetry(value=>value+1)}>Reintentar radio</button>:null}
    {blockedAudio?<button className="btn secondary" onClick={()=>{void new Audio(blockedAudio).play().then(()=>setBlockedAudio(null)).catch(()=>undefined)}}>Escuchar última transmisión</button>:null}
    <p className="muted">Personal de la empresa en línea: {online===null?"consultando presencia":users.filter(user=>online.has(user.id)).map(user=>user.name).join(", ")||"sin otros usuarios conectados"}</p>
  </div>;
}
