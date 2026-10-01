import type {Server} from "socket.io";
import type {SessionToken} from "@/src/core/contracts/auth";
import {hasPermission} from "@/src/core/domain/permissions";
export function incidentRoomForSession(session:Pick<SessionToken,"organizationId"|"channel"|"roles">){
  return session.organizationId&&session.channel==="company_portal"&&hasPermission(session.roles,"manage_incidents")?"org:"+session.organizationId+":incidents":null;
}
export function publishIncident(io:Server,organizationId:string,driverId:string|null,event:string,payload:unknown){
  let target=io.to("org:"+organizationId+":incidents");
  if(driverId)target=target.to("user:"+driverId);
  target.emit(event,payload);
}
