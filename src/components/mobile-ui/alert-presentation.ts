const headings=["Críticas","Operativas","Informativas","Reportes"] as const;
type Heading=typeof headings[number];
export function severityGroup(value:string|null|undefined):Heading{
  return value==="critical"||value==="high"?"Críticas":value==="medium"?"Operativas":value==="low"?"Informativas":"Reportes";
}
export function groupIncidentReports<T extends {severity?:string|null}>(items:readonly T[]):Array<{heading:Heading;items:T[]}>{
  const groups=headings.map(heading=>({heading,items:[] as T[]}));
  for(const item of items)groups.find(group=>group.heading===severityGroup(item.severity))!.items.push(item);
  return groups.filter(group=>group.items.length);
}
export function incidentStatus(value:string|null|undefined){
  return value==="open"?"Abierta":value==="acknowledged"?"En seguimiento":value==="resolved"?"Resuelta":value||"Estado no disponible";
}
export function incidentDate(value:string|null|undefined){
  if(!value)return "Fecha no disponible";
  const date=new Date(value);return Number.isNaN(date.getTime())?"Fecha no disponible":date.toLocaleString();
}
