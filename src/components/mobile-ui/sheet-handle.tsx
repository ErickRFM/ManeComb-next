import { Icon } from "@/src/components/ui/icon";

export type SheetLevel="compact"|"medium"|"expanded";
const labels:Record<SheetLevel,string>={compact:"Contexto compacto",medium:"Contexto medio",expanded:"Contexto ampliado"};

export function SheetHandle({level,controlsId,onLevelChange}:{level:SheetLevel;controlsId:string;onLevelChange:(level:SheetLevel)=>void}){
  return <div className="mobile-v3-sheet-handle">
    {/* aria-disabled keeps keyboard focus when the owner reaches an endpoint; guards block activation. */}
    <button type="button" className="mobile-v3-button" aria-label="Ampliar contexto" aria-controls={controlsId} aria-disabled={level==="expanded"} onClick={()=>{if(level!=="expanded")onLevelChange(level==="compact"?"medium":"expanded")}}><Icon name="more"/></button>
    <span className="mobile-v3-sheet-level">{labels[level]}</span>
    <button type="button" className="mobile-v3-button" aria-label="Reducir contexto" aria-controls={controlsId} aria-disabled={level==="compact"} onClick={()=>{if(level!=="compact")onLevelChange(level==="expanded"?"medium":"compact")}}><Icon name="close"/></button>
  </div>;
}
