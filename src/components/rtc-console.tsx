"use client";
import {useEffect,useRef,useState} from "react";
import {useSocket,useSocketStatus} from "@/src/hooks/useSocket";
type Signal={type:"offer"|"answer";sdp:RTCSessionDescriptionInit}|{type:"ice";candidate:RTCIceCandidateInit}|{type:"hangup"};
export function RtcConsole(){
  const socket=useSocket(),connection=useSocketStatus(socket);
  const [targetUserId,setTargetUserId]=useState("");
  const [users,setUsers]=useState<Array<{id:string;name:string}>>([]);
  const [state,setState]=useState("Sin llamada"),[error,setError]=useState(""),[configError,setConfigError]=useState(""),[loading,setLoading]=useState(true),[active,setActive]=useState(false),[retry,setRetry]=useState(0);
  const [turn,setTurn]=useState(false);
  const iceServers=useRef<RTCIceServer[]>([]),peerRef=useRef<RTCPeerConnection|null>(null),streamRef=useRef<MediaStream|null>(null),remoteAudioRef=useRef<HTMLAudioElement|null>(null),peerUserRef=useRef(""),generation=useRef(0),pendingIce=useRef<RTCIceCandidateInit[]>([]);
  useEffect(()=>{
    let mounted=true;setLoading(true);setConfigError("");
    void Promise.all([fetch("/api/rtc/config"),fetch("/api/chat/users")]).then(async([config,directory])=>{
      if(!config.ok||!directory.ok)throw new Error();const [data,people]=await Promise.all([config.json(),directory.json()]);
      if(mounted){iceServers.current=data.iceServers||[];setTurn(Boolean(data.turnEnabled));setUsers(people.users||[])}
    }).catch(()=>{if(mounted)setConfigError("No se pudieron cargar las llamadas. Revisa tu conexión o tu acceso.")}).finally(()=>{if(mounted)setLoading(false)});
    return()=>{mounted=false};
  },[retry]);
  function clearMedia(){
    generation.current++;peerRef.current?.close();peerRef.current=null;streamRef.current?.getTracks().forEach(track=>track.stop());streamRef.current=null;peerUserRef.current="";pendingIce.current=[];if(remoteAudioRef.current)remoteAudioRef.current.srcObject=null;
  }
  function hangup(notify=true){
    if(notify&&socket.connected&&peerUserRef.current)socket.emit("rtc:signal",{targetUserId:peerUserRef.current,signal:{type:"hangup"}});
    clearMedia();setActive(false);setState("Sin llamada");
  }
  async function createPeer(remoteUserId:string){
    clearMedia();const attempt=generation.current;
    const peer=new RTCPeerConnection({iceServers:iceServers.current});peerRef.current=peer;peerUserRef.current=remoteUserId;setActive(true);
    const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}});
    if(attempt!==generation.current){stream.getTracks().forEach(track=>track.stop());throw new DOMException("Call cancelled","AbortError")}
    streamRef.current=stream;stream.getTracks().forEach(track=>peer.addTrack(track,stream));
    peer.ontrack=event=>{if(remoteAudioRef.current)remoteAudioRef.current.srcObject=event.streams[0]};
    peer.onicecandidate=event=>{if(event.candidate&&attempt===generation.current&&socket.connected)socket.emit("rtc:signal",{targetUserId:remoteUserId,signal:{type:"ice",candidate:event.candidate.toJSON()}})};
    peer.onconnectionstatechange=()=>{if(attempt!==generation.current)return;if(peer.connectionState==="connected")setState("Llamada conectada");if(["failed","disconnected","closed"].includes(peer.connectionState)){hangup();setState("Llamada finalizada")}};
    return peer;
  }
  function failed(error:unknown,message:string){if(error instanceof DOMException&&error.name==="AbortError")return;hangup();setError(message)}
  async function call(){
    if(!targetUserId||!socket.connected||active||loading||configError)return;setError("");setState("Llamando…");
    try{const peer=await createPeer(targetUserId);const offer=await peer.createOffer();await peer.setLocalDescription(offer);if(peerRef.current===peer)socket.emit("rtc:signal",{targetUserId,signal:{type:"offer",sdp:offer}})}catch(error){failed(error,"No se pudo iniciar el audio. Revisa el permiso de micrófono.")}
  }
  useEffect(()=>{
    const handler=async({fromUserId,signal}:{fromUserId:string;signal:Signal})=>{
      if(peerUserRef.current&&peerUserRef.current!==fromUserId)return;
      try{
        if(signal.type==="hangup"){hangup(false);return}
        if(signal.type==="offer"){
          if(loading||configError)return;setTargetUserId(fromUserId);setError("");setState("Llamada entrante…");
          const peer=await createPeer(fromUserId);await peer.setRemoteDescription(signal.sdp);const answer=await peer.createAnswer();await peer.setLocalDescription(answer);if(peerRef.current===peer)socket.emit("rtc:signal",{targetUserId:fromUserId,signal:{type:"answer",sdp:answer}});
          for(const candidate of pendingIce.current)await peer.addIceCandidate(candidate);pendingIce.current=[];return;
        }
        const peer=peerRef.current;if(!peer)return;
        if(signal.type==="answer"){await peer.setRemoteDescription(signal.sdp);for(const candidate of pendingIce.current)await peer.addIceCandidate(candidate);pendingIce.current=[]}
        if(signal.type==="ice"){if(peer.remoteDescription)await peer.addIceCandidate(signal.candidate);else pendingIce.current.push(signal.candidate)}
      }catch(error){failed(error,"No se pudo completar la llamada. Vuelve a intentar.")}
    };
    const disconnected=()=>hangup(false);socket.on("rtc:signal",handler);socket.on("disconnect",disconnected);
    return()=>{socket.off("rtc:signal",handler);socket.off("disconnect",disconnected);clearMedia()};
  },[socket,loading,configError]);
  return <div className="card grid"><strong>Llamada de audio</strong>
    <span role="status">{loading?"Cargando llamadas…":connection==="connected"?"En línea":"Reconectando"}</span>
    {configError?<p role="alert">{configError} <button className="btn secondary" onClick={()=>setRetry(value=>value+1)}>Reintentar llamadas</button></p>:null}
    <label>Persona para llamar<select className="input" value={targetUserId} disabled={active||loading} onChange={event=>setTargetUserId(event.target.value)}><option value="">Selecciona una persona</option>{users.map(user=><option value={user.id} key={user.id}>{user.name}</option>)}</select></label>
    {!loading&&!configError&&!users.length?<p>No hay personas disponibles en el directorio.</p>:null}
    <div style={{display:"flex",gap:8,flexWrap:"wrap"}}><button className="btn" disabled={!targetUserId||active||loading||Boolean(configError)||connection!=="connected"} onClick={()=>void call()}>Llamar</button><button className="btn secondary" disabled={!active} onClick={()=>hangup()}>Colgar</button></div>
    <span className="muted" role="status">{state}</span>{error?<p role="alert">{error}</p>:null}
    {!loading&&!configError&&!turn?<p className="muted">La conectividad entre redes requiere validar el servicio TURN.</p>:null}<audio ref={remoteAudioRef} autoPlay playsInline controls aria-label="Audio de la llamada"/>
  </div>;
}
