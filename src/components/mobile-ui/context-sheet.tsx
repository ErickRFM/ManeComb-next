import type { ReactNode } from "react";
import { SheetHandle, type SheetLevel } from "./sheet-handle";

export function ContextSheet({id,title,level,summary,children,onLevelChange}:{id:string;title:string;level:SheetLevel;summary:ReactNode;children:ReactNode;onLevelChange:(level:SheetLevel)=>void}){
  return <section id={id} className="mobile-v3-context-sheet" data-level={level} role="region" aria-label={title}>
    <h2 className="mobile-v3-section-title">{title}</h2>
    <SheetHandle level={level} controlsId={id} onLevelChange={onLevelChange}/>
    <div className="mobile-v3-sheet-summary">{summary}</div>
    <div className="mobile-v3-sheet-body" hidden={level==="compact"} tabIndex={level==="compact"?undefined:0} role="region" aria-label={`Contenido de ${title}`}>{children}</div>
  </section>;
}
