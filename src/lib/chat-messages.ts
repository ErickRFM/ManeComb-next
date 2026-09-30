import type {uploadManeCombFile} from "@/src/lib/client-upload";
export type ChatMessage={_id?:string;senderUserId?:string;recipientUserId?:string|null;channelId:string;kind:"text"|"image";body:string;attachment?:Awaited<ReturnType<typeof uploadManeCombFile>>;createdAt?:string;clientMessageId?:string};
export type ChatPacket=Pick<ChatMessage,"channelId"|"clientMessageId"|"recipientUserId"|"kind"|"body"|"attachment">;
export function mergeChatMessages(current:ChatMessage[],incoming:ChatMessage[]):ChatMessage[]{
  const result=[...current];
  for(const next of incoming){
    const index=result.findIndex(item=>item.channelId===next.channelId&&(
      Boolean(next._id&&item._id===next._id)||Boolean(next.clientMessageId&&item.clientMessageId===next.clientMessageId&&item.senderUserId===next.senderUserId)
    ));
    if(index<0)result.push(next);else result[index]={...result[index],...next};
  }
  return result.sort((a,b)=>(Date.parse(a.createdAt||"")||0)-(Date.parse(b.createdAt||"")||0)).slice(-200);
}
type AckSocket={connected:boolean;timeout(ms:number):{emitWithAck(event:string,payload:ChatPacket):Promise<{ok?:boolean;message?:ChatMessage;error?:string}>}};
export async function deliverChatMessage(socket:AckSocket,packet:ChatPacket):Promise<ChatMessage>{
  if(!socket.connected)throw new Error("CHAT_OFFLINE");
  const ack=await socket.timeout(10000).emitWithAck("chat:message",packet);
  if(!ack?.ok||!ack.message)throw new Error(ack?.error||"CHAT_SEND_FAILED");
  return ack.message;
}
