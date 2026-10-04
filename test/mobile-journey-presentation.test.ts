import {expect,it} from "vitest";
import {journeyStateLabel,distanceLabel,orderedStops,routeStateLabel} from "@/src/components/mobile-ui/journey-presentation";

it.each([
  ["ASSIGNED","Preparando jornada"],["READY","Lista para iniciar"],
  ["RUNNING","En ruta"],["PAUSED","Jornada pausada"],
  ["FINISHED","Jornada finalizada"],["CANCELLED","Jornada cancelada"],
  ["UNKNOWN","Estado de jornada no disponible"],["__proto__","Estado de jornada no disponible"],["toString","Estado de jornada no disponible"]
])("presents real journey %s as %s",(state,label)=>expect(journeyStateLabel(state)).toBe(label));
it.each([[null,"Sin dato"],[undefined,"Sin dato"],[0,"0 m"],[125,"125 m"],[NaN,"Sin dato"],[Infinity,"Sin dato"]])("preserves absent versus zero distance %s",(value,label)=>expect(distanceLabel(value as number|null|undefined)).toBe(label));
it("orders a copy without mutating a frozen response or stop identities",()=>{
  const later=Object.freeze({order:2,name:"Later"}),first=Object.freeze({order:0,name:"First"});
  const response=Object.freeze([later,first]);
  expect(orderedStops(response)).toEqual([first,later]);
  expect(response).toEqual([later,first]);expect(orderedStops(response)[0]).toBe(first);
});
it("does not expose inherited object members as route status",()=>expect(routeStateLabel("__proto__")).toBe("Estado de ruta no disponible"));
it.each([["ON_ROUTE","En ruta"],["NEAR_ROUTE","Cerca de la ruta"],["POSSIBLE_DEVIATION","Posible desvío"],["OFF_ROUTE_CONFIRMED","Fuera de ruta"],["RECOVERING","Regresando a la ruta"],["invented","Estado de ruta no disponible"]])("presents only existing route states %s",(state,label)=>expect(routeStateLabel(state)).toBe(label));
