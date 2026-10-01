import {expect,it,vi} from "vitest";
import {setRealtimeServer,disconnectSessionSockets} from "@/src/realtime/runtime";
it("disconnects only sockets issued for the revoked session",async()=>{
  const socket=(jti:string)=>({data:{session:{jti}},emit:vi.fn(),disconnect:vi.fn()});
  const revoked=socket("revoked"),other=socket("other");
  const inRoom=vi.fn(()=>({fetchSockets:async()=>[revoked,other]}));setRealtimeServer({in:inRoom} as any);
  try{
    await disconnectSessionSockets("user-a","revoked");expect(inRoom).toHaveBeenCalledWith("user:user-a");
    expect(revoked.emit).toHaveBeenCalledWith("session:revoked",{reason:"UNAUTHORIZED"});expect(revoked.disconnect).toHaveBeenCalledWith(true);expect(other.disconnect).not.toHaveBeenCalled();
  }finally{setRealtimeServer(null)}
});
