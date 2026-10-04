import {expect,it} from "vitest";
import {severityGroup,groupIncidentReports,incidentStatus,incidentDate} from "@/src/components/mobile-ui/alert-presentation";
it.each([
  ["critical","Críticas"],["high","Críticas"],["medium","Operativas"],["low","Informativas"],
  [null,"Reportes"],[undefined,"Reportes"],["","Reportes"],["unknown","Reportes"],["constructor","Reportes"],["__proto__","Reportes"],
])("uses only supplied severity %s",(value,heading)=>expect(severityGroup(value)).toBe(heading));
it("groups a frozen response copy, preserving identity and server order within each group",()=>{
  const items=Object.freeze([{id:"m",severity:"medium"},{id:"c",severity:"critical"},{id:"n"},{id:"h",severity:"high"},{id:"l",severity:"low"},{id:"u",severity:null}].map(item=>Object.freeze(item)));
  const result=groupIncidentReports(items);
  expect(result.map(group=>group.heading)).toEqual(["Críticas","Operativas","Informativas","Reportes"]);
  expect(result.map(group=>group.items.map(item=>item.id))).toEqual([["c","h"],["m"],["l"],["n","u"]]);
  expect(result[0].items[0]).toBe(items[1]);expect(result[3].items[1]).toBe(items[5]);expect(items.map(item=>item.id)).toEqual(["m","c","n","h","l","u"]);
});
it("does not invent empty severity cards",()=>expect(groupIncidentReports([])).toEqual([]));
it.each([["open","Abierta"],["acknowledged","En seguimiento"],["resolved","Resuelta"],["future","future"],[null,"Estado no disponible"],[undefined,"Estado no disponible"],["constructor","constructor"]])("preserves actual status %s without confirming missing open",(value,label)=>expect(incidentStatus(value)).toBe(label));
it.each([null,undefined,"","invalid","2026-99-99"])("does not fabricate date %s",value=>expect(incidentDate(value)).toBe("Fecha no disponible"));
it("formats only the supplied valid timestamp",()=>expect(incidentDate("2026-10-03T21:00:00.000Z")).toBe(new Date("2026-10-03T21:00:00.000Z").toLocaleString()));
