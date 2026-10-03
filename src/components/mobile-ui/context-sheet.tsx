"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { SheetHandle, type SheetLevel } from "./sheet-handle";

export function ContextSheet({id,title,level,summary,children,onLevelChange}:{id:string;title:string;level:SheetLevel;summary:ReactNode;children:ReactNode;onLevelChange:(level:SheetLevel)=>void}){
  const sheet=useRef<HTMLElement>(null);
  useEffect(()=>{
    const node=sheet.current;if(!node)return;
    const fixed=Array.from(node.children).filter(child=>!child.classList.contains("mobile-v3-sheet-body"));
    const measure=()=>{
      const style=getComputedStyle(node);
      const padding=parseFloat(style.paddingTop)+parseFloat(style.paddingBottom)+parseFloat(style.borderTopWidth)+parseFloat(style.borderBottomWidth);
      const compact=fixed.reduce((height,child)=>height+child.getBoundingClientRect().height,0)+padding+parseFloat(style.rowGap)*(fixed.length-1);
      node.style.setProperty("--mobile-v3-sheet-compact",`${Math.ceil(Math.max(128,compact))}px`);
    };
    // Observe only presentation geometry. Level and operational state remain owned by the consumer.
    const observer=new ResizeObserver(measure);fixed.forEach(child=>observer.observe(child));measure();
    return ()=>observer.disconnect();
  },[]);
  return <section ref={sheet} id={id} className="mobile-v3-context-sheet" data-level={level} role="region" aria-label={title}>
    <h2 className="mobile-v3-section-title">{title}</h2>
    <SheetHandle level={level} controlsId={id} onLevelChange={onLevelChange}/>
    <div className="mobile-v3-sheet-summary">{summary}</div>
    <div className="mobile-v3-sheet-body" hidden={level==="compact"} tabIndex={level==="compact"?undefined:0} role="region" aria-label={`Contenido de ${title}`}>{children}</div>
  </section>;
}
