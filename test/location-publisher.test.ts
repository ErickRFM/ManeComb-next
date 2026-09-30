import { afterEach, expect, it, vi } from "vitest";
import { publishLocationSnapshot } from "@/src/realtime/services/location-publisher";
afterEach(()=>vi.useRealTimers());
function fixture(){
  const emit=vi.fn();const rooms:string[]=[];let closed!:()=>void;
  const io:any={to:(room:string)=>{rooms.push(room);return io},emit,once:(_event:string,callback:()=>void)=>closed=callback};
  return {io,emit,rooms,close:()=>closed()};
}
it("coalesces a burst while retaining the latest canonical point",()=>{
  vi.useFakeTimers();const f=fixture();
  for(let point=0;point<500;point++)publishLocationSnapshot(f.io,"org-a",{vehicleId:"vehicle-a",driverId:"driver-a",latitude:point,recordedAt:new Date(1000+point).toISOString()} as any);
  vi.advanceTimersByTime(250);
  expect(f.emit).toHaveBeenCalledOnce();
  expect(f.emit).toHaveBeenLastCalledWith("location:snapshot",expect.objectContaining({latitude:499}));
  expect(f.rooms).toEqual(["org:org-a:monitor","user:driver-a"]);
  f.close();
});
it("cannot publish an older point after a newer one and clears timers on close",()=>{
  vi.useFakeTimers();const f=fixture();
  const sample={vehicleId:"vehicle-a",driverId:"driver-a",recordedAt:new Date(2000).toISOString()};
  publishLocationSnapshot(f.io,"org-a",sample as any);vi.advanceTimersByTime(250);
  publishLocationSnapshot(f.io,"org-a",{...sample,recordedAt:new Date(1000).toISOString()} as any);vi.advanceTimersByTime(250);
  expect(f.emit).toHaveBeenCalledOnce();
  publishLocationSnapshot(f.io,"org-b",sample as any);f.close();vi.advanceTimersByTime(250);
  expect(f.emit).toHaveBeenCalledOnce();
});
