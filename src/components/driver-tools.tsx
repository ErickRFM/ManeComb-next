"use client";
import {useEffect,useRef} from "react";
import {usePathname} from "next/navigation";
export function DriverTools({children}:{children:React.ReactNode}){
  const panel=useRef<HTMLDetailsElement|null>(null);
  const pathname=usePathname();
  useEffect(()=>{
    const open=()=>{if(window.location.hash==="#controles-jornada"&&panel.current)panel.current.open=true};
    open();window.addEventListener("hashchange",open);return()=>window.removeEventListener("hashchange",open);
  },[pathname]);
  return <details ref={panel} className="driver-tools" id="controles-jornada"><summary><span>Controles de jornada y GPS</span><small>Checklist, iniciar/pausar/finalizar y diagnóstico de seguimiento</small></summary><div className="driver-tools-body">{children}</div></details>;
}
