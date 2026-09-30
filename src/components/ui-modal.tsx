"use client";

import { useLayoutEffect, useId, useRef } from "react";

const focusableSelector='button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

export function UiModal({open,title,description,onClose,children}:{open:boolean;title:string;description?:string;onClose:()=>void;children:React.ReactNode}){
  const dialogRef=useRef<HTMLElement|null>(null);
  const closeRef=useRef(onClose);
  closeRef.current=onClose;
  const titleId=useId();
  const detailId=useId();

  useLayoutEffect(()=>{
    if(!open)return;
    const previousFocus=document.activeElement instanceof HTMLElement?document.activeElement:null;
    const previousOverflow=document.body.style.overflow;
    document.body.style.overflow="hidden";

    const focusables=()=>Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(focusableSelector)||[]);
    focusables()[0]?.focus();

    const handler=(event:KeyboardEvent)=>{
      if(event.key==="Escape"){event.preventDefault();closeRef.current();return}
      if(event.key!=="Tab")return;
      const nodes=focusables();
      if(!nodes.length){event.preventDefault();dialogRef.current?.focus();return}
      const first=nodes[0],last=nodes[nodes.length-1];
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}
    };

    window.addEventListener("keydown",handler);
    return()=>{
      window.removeEventListener("keydown",handler);
      document.body.style.overflow=previousOverflow;
      previousFocus?.focus();
    };
  },[open]);

  if(!open)return null;
  const descriptionId=description?detailId:undefined;
  return <div className="ui-modal-layer" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)onClose()}}>
    <section ref={dialogRef} className="ui-modal" role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId} tabIndex={-1}>
      <header className="ui-modal-head">
        <div><span className="eyebrow">MANECOMB</span><h2 id={titleId}>{title}</h2>{description?<p id={descriptionId}>{description}</p>:null}</div>
        <button type="button" className="icon-action" onClick={onClose} aria-label="Cerrar">×</button>
      </header>
      <div className="ui-modal-body">{children}</div>
    </section>
  </div>;
}
