"use client";
import {useEffect,useRef} from "react";
import {usePathname} from "next/navigation";
export function DriverTools({children,onOpen}:{children:React.ReactNode;onOpen?:()=>void}){
  const panel=useRef<HTMLDetailsElement|null>(null);
  const pathname=usePathname();
  useEffect(()=>{
    const open=()=>{if(window.location.hash==="#controles-jornada"&&panel.current){panel.current.open=true;onOpen?.()}};
    open();window.addEventListener("hashchange",open);return()=>window.removeEventListener("hashchange",open);
  },[pathname,onOpen]);
  return <details ref={panel} className="driver-tools" id="controles-jornada" onToggle={event=>{if(event.currentTarget.open)onOpen?.()}}><summary><span>Controles de jornada y GPS</span><small>Checklist, iniciar/pausar/finalizar y diagnóstico de seguimiento</small></summary><div className="driver-tools-body">{children}</div></details>;
}
