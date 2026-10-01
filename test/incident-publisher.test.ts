import {expect,it,vi} from "vitest";
import {incidentRoomForSession,publishIncident} from "@/src/realtime/services/incident-publisher";
it("subscribes only incident managers in the company channel",()=>{
  const base={sub:"u",organizationId:"a",roles:["owner"] as any};
  expect(incidentRoomForSession({...base,channel:"company_portal"})).toBe("org:a:incidents");
  expect(incidentRoomForSession({...base,roles:["viewer"],channel:"company_portal"})).toBeNull();
  expect(incidentRoomForSession({...base,roles:["driver"],channel:"mobile_operations"})).toBeNull();
});
it("publishes incident detail to managers and its reporting driver without broadcasting to the tenant",()=>{
  const rooms:string[]=[];const emit=vi.fn();const target:any={to:(room:string)=>{rooms.push(room);return target},emit};
  publishIncident(target,"a","driver-a","incident:new",{_id:"incident-a"});
  expect(rooms).toEqual(["org:a:incidents","user:driver-a"]);expect(emit).toHaveBeenCalledWith("incident:new",{_id:"incident-a"});
});
