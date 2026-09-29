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
  const [state,setState]=useState("Listo");
  const recorderRef=useRef<MediaRecorder|null>(null);
  const streamRef=useRef<MediaStream|null>(null);

  useEffect(()=>{
    const play=({chunk}:{chunk:string})=>{
      const audio=new Audio(chunk);
      void audio.play().catch(()=>undefined);
    };
    socket.on("radio:audio",play);
    return()=>{socket.off("radio:audio",play)}
  },[socket]);

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
    <input className="input" value={channelId} onChange={(e)=>setChannelId(e.target.value)} placeholder="Canal"/>
    <button className="btn" style={{minHeight:140,fontSize:28,touchAction:"none"}} onPointerDown={()=>void press()} onPointerUp={release} onPointerCancel={release}>MANTÉN PARA HABLAR</button>
    <strong>{state}</strong>
    <p className="muted">Audio Opus en chunks cortos, control de piso central y reproducción inmediata a los demás miembros del tenant.</p>
  </div>
}
