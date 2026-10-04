"use client";

import { useCallback,useEffect,useLayoutEffect,useRef,useState,type KeyboardEvent,type PointerEvent,type ReactNode } from "react";
import { SheetHandle, type SheetLevel } from "./sheet-handle";
import {closestSheetLevel} from "./sheet-geometry";

export function ContextSheet({id,title,level,summary,children,onLevelChange,resetKey}:{id:string;title:string;level:SheetLevel;summary:ReactNode;children:ReactNode;onLevelChange:(level:SheetLevel)=>void;resetKey?:string|null}){
  const sheet=useRef<HTMLElement>(null);
  const grip=useRef<HTMLSpanElement>(null),body=useRef<HTMLDivElement>(null),bodyFocus=useRef<HTMLElement|null>(null);
  const drag=useRef<{pointerId:number;node:HTMLSpanElement;y:number;height:number;previous:SheetLevel;targets:Record<SheetLevel,number>}|null>(null);
  const [dragHeight,setDragHeight]=useState<number|null>(null);
  const cancel=useCallback(()=>{
    const current=drag.current;drag.current=null;setDragHeight(null);
    if(current?.node.hasPointerCapture(current.pointerId))current.node.releasePointerCapture(current.pointerId);
  },[]);
  useLayoutEffect(()=>{
    cancel();
    if(level==="compact"&&bodyFocus.current&&body.current?.contains(bodyFocus.current)){
      const active=document.activeElement;
      if(active===document.body||body.current.contains(active)){grip.current?.focus();bodyFocus.current=null}
    }
  },[level,resetKey,cancel]);
  useEffect(()=>{window.addEventListener("resize",cancel);window.addEventListener("orientationchange",cancel);return()=>{window.removeEventListener("resize",cancel);window.removeEventListener("orientationchange",cancel);const current=drag.current;drag.current=null;if(current?.node.hasPointerCapture(current.pointerId))current.node.releasePointerCapture(current.pointerId)}},[cancel]);
  function down(event:PointerEvent<HTMLSpanElement>){
    if(!event.isPrimary||event.button!==0||drag.current||!sheet.current)return;
    const targets={} as Record<SheetLevel,number>;
    for(const target of ["compact","medium","expanded"] as const){const probe=sheet.current.querySelector<HTMLElement>(`[data-sheet-measure="${target}"]`);if(!probe)return;targets[target]=probe.getBoundingClientRect().height}
    event.preventDefault();event.currentTarget.focus();event.currentTarget.setPointerCapture(event.pointerId);
    drag.current={pointerId:event.pointerId,node:event.currentTarget,y:event.clientY,height:sheet.current.getBoundingClientRect().height,previous:level,targets};
    setDragHeight(drag.current.height);
  }
  function heightAt(y:number,current:NonNullable<typeof drag.current>){return Math.max(Math.min(...Object.values(current.targets)),Math.min(Math.max(...Object.values(current.targets)),current.height+current.y-y))}
  function move(event:PointerEvent<HTMLSpanElement>){const current=drag.current;if(current&&event.pointerId===current.pointerId)setDragHeight(heightAt(event.clientY,current))}
  function up(event:PointerEvent<HTMLSpanElement>){
    const current=drag.current;if(!current||event.pointerId!==current.pointerId)return;
    const next=closestSheetLevel(heightAt(event.clientY,current),current.targets,current.previous);cancel();if(next!==level)onLevelChange(next);
  }
  function cancelPointer(event:PointerEvent<HTMLSpanElement>){
    if(drag.current?.pointerId===event.pointerId)cancel();
  }
  function key(event:KeyboardEvent<HTMLSpanElement>){
    const levels:SheetLevel[]=["compact","medium","expanded"],index=levels.indexOf(level);
    const next=event.key==="Home"||event.key==="Escape"?"compact":event.key==="End"?"expanded":event.key==="ArrowUp"?levels[Math.min(2,index+1)]:event.key==="ArrowDown"?levels[Math.max(0,index-1)]:null;
    if(next){event.preventDefault();cancel();if(next!==level)onLevelChange(next)}
  }
  useEffect(()=>{
    const node=sheet.current;if(!node)return;
    const fixed=Array.from(node.children).filter(child=>!child.classList.contains("mobile-v3-sheet-body")&&!child.classList.contains("mobile-v3-sheet-measures"));
    const measure=()=>{
      const style=getComputedStyle(node);
      const flow=fixed.filter(child=>{const childStyle=getComputedStyle(child);return childStyle.display!=="none"&&childStyle.position!=="absolute"&&childStyle.position!=="fixed"});
      const padding=parseFloat(style.paddingTop)+parseFloat(style.paddingBottom)+parseFloat(style.borderTopWidth)+parseFloat(style.borderBottomWidth);
      const compact=Math.ceil(Math.max(128,flow.reduce((height,child)=>height+child.getBoundingClientRect().height,0)+padding+parseFloat(style.rowGap)*Math.max(0,flow.length-1)));
      if(parseFloat(node.style.getPropertyValue("--mobile-v3-sheet-compact"))!==compact){
        node.style.setProperty("--mobile-v3-sheet-compact",`${compact}px`);
        if(drag.current)cancel();
      }
    };
    // Observe only presentation geometry. Level and operational state remain owned by the consumer.
    const observer=new ResizeObserver(measure);fixed.forEach(child=>observer.observe(child));measure();
    return ()=>observer.disconnect();
  },[cancel]);
  return <section ref={sheet} id={id} className="mobile-v3-context-sheet" data-level={level} data-dragging={dragHeight===null?undefined:true} style={dragHeight===null?undefined:{height:dragHeight,transitionProperty:"none"}} role="region" aria-label={title} onKeyDown={event=>{if(event.key!=="Escape"||event.defaultPrevented)return;const target=event.target;if(!(target instanceof HTMLElement)||target.closest('input,textarea,select,[contenteditable="true"],[role="dialog"],dialog'))return;if(target.closest('.mobile-v3-sheet-handle')||target===body.current){event.preventDefault();cancel();if(level!=="compact")onLevelChange("compact")}}}>
    <h2 className="mobile-v3-section-title">{title}</h2>
    <SheetHandle level={level} controlsId={id} onLevelChange={onLevelChange} gripRef={grip} gripProps={{onPointerDown:down,onPointerMove:move,onPointerUp:up,onPointerCancel:cancelPointer,onLostPointerCapture:cancelPointer,onKeyDown:key}}/>
    <div className="mobile-v3-sheet-summary">{summary}</div>
    <div ref={body} className="mobile-v3-sheet-body" hidden={level==="compact"} tabIndex={level==="compact"?undefined:0} role="region" aria-label={`Contenido de ${title}`} onFocusCapture={event=>{bodyFocus.current=event.target as HTMLElement}} onBlurCapture={event=>{if(event.relatedTarget instanceof Node&&!body.current?.contains(event.relatedTarget))bodyFocus.current=null}}>{children}</div>
    <div className="mobile-v3-sheet-measures" aria-hidden="true">{(["compact","medium","expanded"] as const).map(target=><span key={target} data-sheet-measure={target}/>)}</div>
  </section>;
}
