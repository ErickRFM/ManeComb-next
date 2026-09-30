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
  const [state,setState]=useState("Conectando canal...");
  const recorderRef=useRef<MediaRecorder|null>(null);
  const streamRef=useRef<MediaStream|null>(null);

  useEffect(()=>{
    const join=()=>socket.emit("radio:join",{channelId},(ack:any)=>setState(ack?.ok?"Escuchando":"No se pudo unir al canal"));
    socket.on("connect",join);
    if(socket.connected)join();
    const play=({channelId:incomingChannel,chunk}:{channelId:string;chunk:string})=>{
      if(incomingChannel!==channelId)return;
      const audio=new Audio(chunk);
      void audio.play().catch(()=>undefined);
    };
    const lost=({channelId:lostChannel}:{channelId:string})=>{
      if(lostChannel===channelId)setState("Se perdió el turno de transmisión");
    };
    socket.on("radio:audio",play);
    socket.on("radio:floor-lost",lost);
    return()=>{
      socket.off("connect",join);
      socket.emit("radio:leave",{channelId});
      socket.off("radio:audio",play);
      socket.off("radio:floor-lost",lost);
    }
  },[socket,channelId]);

  async function press(){
    if(recorderRef.current)return;
    setState("Solicitando canal...");
    const granted=await new Promise<boolean>((resolve)=>{
      socket.emit("radio:request-floor",{channelId},(ack:any)=>resolve(Boolean(ack?.ok)));
    });
    if(!granted){setState("Canal ocupado");return}

    try{
      const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}});
      streamRef.current=stream;
      const mimeType=MediaRecorder.isTypeSupported("audio/webm;codecs=opus")?"audio/webm;codecs=opus":"audio/webm";
      const recorder=new MediaRecorder(stream,{mimeType,audioBitsPerSecond:24000});
      recorder.ondataavailable=(event)=>{
        if(event.data.size===0)return;
        void blobToDataUrl(event.data).then((chunk)=>socket.emit("radio:audio",{channelId,chunk}));
      };
      recorder.onstop=()=>{stream.getTracks().forEach(track=>track.stop());streamRef.current=null;recorderRef.current=null};
      recorderRef.current=recorder;
      recorder.start(300);
      setState("Hablando");
    }catch{
      socket.emit("radio:release-floor",{channelId});
      setState("Micrófono no disponible");
    }
  }

  function release(){
    recorderRef.current?.stop();
    streamRef.current?.getTracks().forEach(track=>track.stop());
    socket.emit("radio:release-floor",{channelId});
    setState("Escuchando");
  }

  return <div className="card grid">
    <input className="input" value={channelId} onChange={(e)=>setChannelId(e.target.value.trim()||"general")} placeholder="Canal"/>
    <button className="btn" style={{minHeight:140,fontSize:28,touchAction:"none"}} onPointerDown={()=>void press()} onPointerUp={release} onPointerCancel={release}>MANTÉN PARA HABLAR</button>
    <strong>{state}</strong>
    <p className="muted">El audio y el floor-control están aislados por organización y canal; Redis arbitra el turno entre instancias.</p>
  </div>
}
