"use client";
import { useEffect, useRef, useState } from "react";
import { useSocket } from "@/src/hooks/useSocket";

type Signal =
  | { type:"offer"; sdp:RTCSessionDescriptionInit }
  | { type:"answer"; sdp:RTCSessionDescriptionInit }
  | { type:"ice"; candidate:RTCIceCandidateInit }
  | { type:"hangup" };

export function RtcConsole(){
  const socket=useSocket();
  const [targetUserId,setTargetUserId]=useState("");
  const [state,setState]=useState("Sin llamada");
  const [iceServers,setIceServers]=useState<RTCIceServer[]>([{urls:"stun:stun.l.google.com:19302"}]);
  const peerRef=useRef<RTCPeerConnection|null>(null);
  const streamRef=useRef<MediaStream|null>(null);
  const remoteAudioRef=useRef<HTMLAudioElement|null>(null);
  const peerUserRef=useRef("");

  useEffect(()=>{
    fetch("/api/rtc/config").then(async response=>{
      const data=await response.json();
      if(!response.ok)throw new Error(data.error||"RTC_CONFIG_ERROR");
      if(Array.isArray(data.iceServers)&&data.iceServers.length)setIceServers(data.iceServers);
      if(!data.turnEnabled)setState("RTC disponible · TURN no configurado");
    }).catch(()=>setState("No se pudo cargar configuración RTC"));
  },[]);

  async function ensureMedia(){
    if(streamRef.current)return streamRef.current;
    const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}});
    streamRef.current=stream;
    return stream;
  }

  async function createPeer(remoteUserId:string){
    peerRef.current?.close();
    const peer=new RTCPeerConnection({iceServers});
    peerRef.current=peer;
    peerUserRef.current=remoteUserId;
    const stream=await ensureMedia();
    stream.getTracks().forEach(track=>peer.addTrack(track,stream));
    peer.ontrack=(event)=>{if(remoteAudioRef.current)remoteAudioRef.current.srcObject=event.streams[0]};
    peer.onicecandidate=(event)=>{
      if(event.candidate)socket.emit("rtc:signal",{targetUserId:peerUserRef.current,signal:{type:"ice",candidate:event.candidate.toJSON()}});
    };
    peer.onconnectionstatechange=()=>{
      if(peer.connectionState==="connected")setState("Llamada conectada");
      if(["failed","disconnected","closed"].includes(peer.connectionState))setState("Llamada finalizada");
    };
    return peer;
  }

  async function call(){
    if(!targetUserId)return setState("Ingresa el ID del usuario");
    try{
      setState("Llamando...");
      const peer=await createPeer(targetUserId);
      const offer=await peer.createOffer();
      await peer.setLocalDescription(offer);
      socket.emit("rtc:signal",{targetUserId,signal:{type:"offer",sdp:offer}});
    }catch{setState("No se pudo iniciar audio")}
  }

  function hangup(notify=true){
    if(notify&&peerUserRef.current)socket.emit("rtc:signal",{targetUserId:peerUserRef.current,signal:{type:"hangup"}});
    peerRef.current?.close();
    peerRef.current=null;
    streamRef.current?.getTracks().forEach(track=>track.stop());
    streamRef.current=null;
    peerUserRef.current="";
    setState("Sin llamada");
  }

  useEffect(()=>{
    const handler=async({fromUserId,signal}:{fromUserId:string;signal:Signal})=>{
      try{
        if(signal.type==="hangup"){hangup(false);return}
        if(signal.type==="offer"){
          setTargetUserId(fromUserId);
          setState("Llamada entrante...");
          const peer=await createPeer(fromUserId);
          await peer.setRemoteDescription(signal.sdp);
          const answer=await peer.createAnswer();
          await peer.setLocalDescription(answer);
          socket.emit("rtc:signal",{targetUserId:fromUserId,signal:{type:"answer",sdp:answer}});
          return;
        }
        const peer=peerRef.current;
        if(!peer)return;
        if(signal.type==="answer")await peer.setRemoteDescription(signal.sdp);
        if(signal.type==="ice")await peer.addIceCandidate(signal.candidate);
      }catch{setState("Error de señalización")}
    };
    socket.on("rtc:signal",handler);
    return()=>{socket.off("rtc:signal",handler);peerRef.current?.close();streamRef.current?.getTracks().forEach(track=>track.stop())}
  },[socket,iceServers]);

  return <div className="card grid">
    <strong>Llamada WebRTC</strong>
    <input className="input" value={targetUserId} onChange={(e)=>setTargetUserId(e.target.value)} placeholder="ID del chofer / usuario"/>
    <div style={{display:"flex",gap:8}}><button className="btn" onClick={()=>void call()}>Llamar</button><button className="btn secondary" onClick={()=>hangup()}>Colgar</button></div>
    <span className="muted">{state}</span>
    <audio ref={remoteAudioRef} autoPlay playsInline/>
  </div>
}
