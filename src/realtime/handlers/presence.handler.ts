import type { Server, Socket } from "socket.io";
import {incidentRoomForSession} from "@/src/realtime/services/incident-publisher";

const HEARTBEAT_TIMEOUT_MS=55_000;
const SWEEP_MS=5_000;

function isFresh(socketLike:any,now=Date.now()){
  const timestamp=Number(socketLike?.data?.lastPresenceHeartbeatAt||0);
  return socketLike?.data?.presenceJoined===true && timestamp>0 && now-timestamp<=HEARTBEAT_TIMEOUT_MS;
}

async function hasAnotherFreshSocket(io:Server,organizationId:string,userId:string,sourceSocketId:string){
  const sockets=await io.in("org:"+organizationId).fetchSockets();
  const now=Date.now();
  return sockets.some(candidate=>
    candidate.id!==sourceSocketId &&
    candidate.data?.session?.sub===userId &&
    isFresh(candidate,now)
  );
}

async function emitOfflineIfLast(io:Server,organizationId:string,userId:string,sourceSocketId:string){
  if(await hasAnotherFreshSocket(io,organizationId,userId,sourceSocketId))return;
  io.to("org:"+organizationId).emit("presence:update",{userId,online:false});
}

export function registerPresenceHandler(io: Server, socket: Socket) {
  const session = socket.data.session;
  if (!session?.sub) return;

  if (session.organizationId) socket.join("org:" + session.organizationId);
  if(session.organizationId&&session.channel==="company_portal")socket.join("org:"+session.organizationId+":monitor");
  socket.join("user:" + session.sub);
  const incidentRoom=incidentRoomForSession(session);
  if(incidentRoom)socket.join(incidentRoom);

  socket.data.presenceJoined=false;
  socket.data.lastPresenceHeartbeatAt=0;

  socket.on("presence:join", async (_payload,ack) => {
    if(!session.organizationId)return ack?.({ok:false,error:"FORBIDDEN"});
    socket.data.presenceJoined=true;
    socket.data.lastPresenceHeartbeatAt=Date.now();
    const orgRoom="org:"+session.organizationId;
    const sockets=await io.in(orgRoom).fetchSockets();
    const onlineUserIds=[...new Set(
      sockets.filter(candidate=>isFresh(candidate)).map(candidate=>String(candidate.data?.session?.sub||"")).filter(Boolean)
    )];
    socket.emit("presence:snapshot",{onlineUserIds,timestamp:new Date().toISOString()});
    io.to(orgRoom).emit("presence:update",{userId:session.sub,online:true});
    ack?.({ok:true});
  });

  socket.on("client:heartbeat", (_payload,ack) => {
    if(!socket.data.presenceJoined)return ack?.({ok:false,error:"PRESENCE_NOT_JOINED"});
    socket.data.lastPresenceHeartbeatAt=Date.now();
    ack?.({ok:true});
  });

  const sweeper=setInterval(()=>{
    if(!session.organizationId||!socket.data.presenceJoined)return;
    if(isFresh(socket))return;
    socket.data.presenceJoined=false;
    void emitOfflineIfLast(io,session.organizationId,session.sub,socket.id);
  },SWEEP_MS);
  sweeper.unref?.();

  socket.on("disconnect", () => {
    clearInterval(sweeper);
    if(session.organizationId){
      socket.data.presenceJoined=false;
      void emitOfflineIfLast(io,session.organizationId,session.sub,socket.id);
    }
  });
}
