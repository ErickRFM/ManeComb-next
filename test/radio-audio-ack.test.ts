import {expect,it,vi} from "vitest";
import {registerRadioHandler} from "@/src/realtime/handlers/radio.handler";
const floor=vi.hoisted(()=>({acquireRadioFloor:vi.fn(async()=>true),refreshRadioFloor:vi.fn(),releaseRadioFloor:vi.fn(async()=>undefined),radioRoom:()=>"radio-qa"}));
vi.mock("@/src/realtime/radio-floor",()=>floor);
vi.mock("@/src/realtime/socket-rate-limit",()=>({allowSocketEvent:()=>true}));
it("acknowledges a radio chunk only after floor validation and broadcast",async()=>{
  const handlers=new Map<string,Function>(),broadcast=vi.fn(),ack=vi.fn();
  const socket:any={id:"socket-a",data:{session:{organizationId:"org-a",sub:"driver-a",roles:["driver"]}},on:(event:string,handler:Function)=>handlers.set(event,handler),join:vi.fn(),emit:vi.fn(),to:()=>({emit:broadcast})};
  registerRadioHandler({to:()=>({emit:vi.fn()})} as any,socket);
  await handlers.get("radio:request-floor")!({channelId:"general"},vi.fn());
  let complete!:(value:boolean)=>void;floor.refreshRadioFloor.mockImplementation(()=>new Promise(resolve=>{complete=resolve}));
  const delivery=handlers.get("radio:audio")!({channelId:"general",chunk:"data:audio/webm;base64,AAAA"},ack);
  expect(ack).not.toHaveBeenCalled();complete(true);await delivery;
  expect(broadcast).toHaveBeenCalledOnce();expect(ack).toHaveBeenCalledWith({ok:true});
  expect(broadcast.mock.invocationCallOrder[0]).toBeLessThan(ack.mock.invocationCallOrder[0]);
});
