import { Icon } from "@/src/components/ui/icon";
import type {HTMLAttributes,Ref} from "react";

export type SheetLevel="compact"|"medium"|"expanded";
const labels:Record<SheetLevel,string>={compact:"Contexto compacto",medium:"Contexto medio",expanded:"Contexto ampliado"};

export function SheetHandle({level,controlsId,onLevelChange,gripRef,gripProps}:{level:SheetLevel;controlsId:string;onLevelChange:(level:SheetLevel)=>void;gripRef?:Ref<HTMLSpanElement>;gripProps?:HTMLAttributes<HTMLSpanElement>}){
  return <div className="mobile-v3-sheet-handle">
    {/* aria-disabled keeps keyboard focus when the owner reaches an endpoint; guards block activation. */}
    <button type="button" className="mobile-v3-button" aria-label="Ampliar contexto" aria-controls={controlsId} aria-disabled={level==="expanded"} onClick={()=>{if(level!=="expanded")onLevelChange(level==="compact"?"medium":"expanded")}}><Icon name="more"/></button>
    <span ref={gripRef} className="mobile-v3-sheet-level" role="slider" tabIndex={0} aria-label="Ajustar nivel del contexto" aria-controls={controlsId} aria-orientation="vertical" aria-valuemin={0} aria-valuemax={2} aria-valuenow={level==="compact"?0:level==="medium"?1:2} aria-valuetext={labels[level]} {...gripProps}>{labels[level]}</span>
    <button type="button" className="mobile-v3-button" aria-label="Reducir contexto" aria-controls={controlsId} aria-disabled={level==="compact"} onClick={()=>{if(level!=="compact")onLevelChange(level==="expanded"?"medium":"compact")}}><Icon name="close"/></button>
  </div>;
}
