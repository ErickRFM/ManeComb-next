"use client";

import { useEffect } from "react";

export function UiModal({open,title,description,onClose,children}:{open:boolean;title:string;description?:string;onClose:()=>void;children:React.ReactNode}){
  useEffect(()=>{
    if(!open)return;
    const handler=(event:KeyboardEvent)=>{if(event.key==="Escape")onClose()};
    window.addEventListener("keydown",handler);
    const previous=document.body.style.overflow;
    document.body.style.overflow="hidden";
    return()=>{window.removeEventListener("keydown",handler);document.body.style.overflow=previous};
  },[open,onClose]);

  if(!open)return null;
  return <div className="ui-modal-layer" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)onClose()}}>
    <section className="ui-modal" role="dialog" aria-modal="true" aria-labelledby="ui-modal-title">
      <header className="ui-modal-head">
        <div><span className="eyebrow">MANECOMB</span><h2 id="ui-modal-title">{title}</h2>{description?<p>{description}</p>:null}</div>
        <button className="icon-action" onClick={onClose} aria-label="Cerrar">×</button>
      </header>
      <div className="ui-modal-body">{children}</div>
    </section>
  </div>;
}
