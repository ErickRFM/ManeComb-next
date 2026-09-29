"use client";

import { useEffect, useRef, useState } from "react";
import { useSocket } from "@/src/hooks/useSocket";

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
  const [channelId,setChannelId]=useState("general");
  const [state,setState]=useState<"connecting"|"listening"|"requesting"|"talking"|"busy"|"error">("connecting");
  const [speaker,setSpeaker]=useState<string|null>(null);
  const [lastRx,setLastRx]=useState<Date|null>(null);
  const recorderRef=useRef<MediaRecorder|null>(null);
  const streamRef=useRef<MediaStream|null>(null);

  useEffect(()=>{
    setState("connecting");
    socket.emit("radio:join",{channelId},(ack:any)=>setState(ack?.ok?"listening":"error"));
    const play=({channelId:incomingChannel,chunk}:{channelId:string;chunk:string})=>{
      if(incomingChannel!==channelId)return;
      setLastRx(new Date());
      const audio=new Audio(chunk);
      void audio.play().catch(()=>undefined);
    };
    const lost=({channelId:lostChannel}:{channelId:string})=>{
      if(lostChannel===channelId){setState("busy");setSpeaker(null)}
    };
    const floor=({channelId:floorChannel,userId,active}:{channelId:string;userId:string;active:boolean})=>{
      if(floorChannel!==channelId)return;
      setSpeaker(active?userId:null);
      if(!recorderRef.current)setState(active?"busy":"listening");
    };
    socket.on("radio:audio",play);
    socket.on("radio:floor-lost",lost);
    socket.on("radio:floor",floor);
    return()=>{
      socket.emit("radio:leave",{channelId});
      socket.off("radio:audio",play);
      socket.off("radio:floor-lost",lost);
      socket.off("radio:floor",floor);
    };
  },[socket,channelId]);

  async function press(){
    if(recorderRef.current)return;
    setState("requesting");
    const granted=await new Promise<boolean>(resolve=>{
      socket.emit("radio:request-floor",{channelId},(ack:any)=>resolve(Boolean(ack?.ok)));
    });
    if(!granted){setState("busy");return}

    try{
      const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}});
      streamRef.current=stream;
      const mimeType=MediaRecorder.isTypeSupported("audio/webm;codecs=opus")?"audio/webm;codecs=opus":"audio/webm";
      const recorder=new MediaRecorder(stream,{mimeType,audioBitsPerSecond:24000});
      recorder.ondataavailable=event=>{
        if(event.data.size===0)return;
        void blobToDataUrl(event.data).then(chunk=>socket.emit("radio:audio",{channelId,chunk}));
      };
      recorder.onstop=()=>{stream.getTracks().forEach(track=>track.stop());streamRef.current=null;recorderRef.current=null};
      recorderRef.current=recorder;
      recorder.start(300);
      setState("talking");
    }catch{
      socket.emit("radio:release-floor",{channelId});
      setState("error");
    }
  }

  function release(){
    recorderRef.current?.stop();
    streamRef.current?.getTracks().forEach(track=>track.stop());
    socket.emit("radio:release-floor",{channelId});
    setState("listening");
  }

  const copy={
    connecting:["Conectando","Preparando canal"],
    listening:["Listo para transmitir","Mantén presionado para hablar"],
    requesting:["Solicitando turno","Esperando disponibilidad"],
    talking:["Transmitiendo","Suelta para escuchar"],
    busy:["Canal ocupado",speaker?"Otro usuario está hablando":"Espera un momento"],
    error:["Radio no disponible","Revisa micrófono o conexión"]
  }[state];

  return <div className="radio-console">
    <div className="radio-console-head">
      <div><span className="eyebrow">RADIO PTT</span><h3>Canal operativo</h3></div>
      <select value={channelId} onChange={e=>setChannelId(e.target.value)} className="radio-channel-select" aria-label="Canal de radio">
        <option value="general">General</option>
        <option value="dispatch">Despacho</option>
        <option value="emergencias">Emergencias</option>
      </select>
    </div>

    <div className={"ptt-stage "+state}>
      <div className="ptt-wave" aria-hidden="true">{Array.from({length:12}).map((_,index)=><span key={index}/>)}</div>
      <div className="ptt-orbit">
        <button className="ptt-button" onPointerDown={()=>void press()} onPointerUp={release} onPointerCancel={release} onPointerLeave={()=>state==="talking"&&release()}>
          <span className="ptt-mic">◉</span>
          <strong>{state==="talking"?"HABLANDO":"PULSA Y HABLA"}</strong>
          <small>{state==="talking"?"Suelta para terminar":"Mantén presionado"}</small>
        </button>
      </div>
    </div>

    <div className="radio-state-card">
      <span className={"radio-state-dot "+state}/>
      <div><strong>{copy[0]}</strong><small>{copy[1]}</small></div>
      <span className="radio-last">{lastRx?"Última RX "+lastRx.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}):"Sin RX reciente"}</span>
    </div>
  </div>;
}
