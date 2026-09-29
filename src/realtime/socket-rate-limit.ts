import type { Socket } from "socket.io";

type Entry={count:number;resetAt:number};

export function allowSocketEvent(
  socket:Socket,
  scope:string,
  limit:number,
  windowMs:number
){
  const now=Date.now();
  const store=(socket.data.rateLimits ||= new Map<string,Entry>()) as Map<string,Entry>;
  const current=store.get(scope);
  if(!current||current.resetAt<=now){
    store.set(scope,{count:1,resetAt:now+windowMs});
    return true;
  }
  current.count+=1;
  return current.count<=limit;
}
