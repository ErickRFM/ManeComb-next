// Presentation only: never infer a timestamp when the message did not supply one.
export function messageTime(value:string|null|undefined){
  if(!value)return "Hora no disponible";
  const timestamp=new Date(value);
  return Number.isFinite(timestamp.getTime())?timestamp.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}):"Hora no disponible";
}
