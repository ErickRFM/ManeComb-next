import {expect,it} from "vitest";
import {mergeChatMessages,deliverChatMessage} from "@/src/lib/chat-messages";
const message={channelId:"dispatch",kind:"text" as const,body:"Hola",clientMessageId:"retry-id",senderUserId:"driver",createdAt:"2026-09-30T12:00:02Z"};
it("merges history arriving after realtime without dropping the newer message",()=>{
  expect(mergeChatMessages([message],[{...message,clientMessageId:"older",createdAt:"2026-09-30T12:00:00Z"}]).map(item=>item.clientMessageId)).toEqual(["older","retry-id"]);
});
it("reconciles the ACK and replay of one client message as a single persisted message",()=>{
  const saved={...message,_id:"mongo-id"};
  expect(mergeChatMessages([message],[saved,saved])).toEqual([saved]);
});
it("does not buffer sends while disconnected and retries with exactly the same payload ID",async()=>{
  const sent:unknown[]=[];
  const socket={connected:false,timeout:()=>({emitWithAck:async (_event:string,payload:unknown)=>{sent.push(payload);return {ok:true,message:{...message,_id:"mongo-id"}}}})};
  await expect(deliverChatMessage(socket,message)).rejects.toThrow("CHAT_OFFLINE");expect(sent).toHaveLength(0);
  socket.connected=true;await deliverChatMessage(socket,message);await deliverChatMessage(socket,message);
  expect(sent).toEqual([message,message]);
});
