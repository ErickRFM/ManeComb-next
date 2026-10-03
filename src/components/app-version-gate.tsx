"use client";
import { useEffect, useState } from "react";
import {createPortal} from "react-dom";
import {useMapFeedbackHost} from "@/src/components/mobile-ui/operation-map-context";
import { isNativeLocationAvailable, getNativeAppInfo } from "@/src/lib/native-location";

export function AppVersionGate(){
  const feedbackHost=useMapFeedbackHost();
  const [gate,setGate]=useState<{blocked:boolean;latest:boolean;message:string;url?:string}|null>(null);

  useEffect(()=>{
    if(!isNativeLocationAvailable())return;
    let mounted=true;
    void Promise.all([
      getNativeAppInfo(),
      fetch("/api/app/releases/android").then(async response=>{
        const data=await response.json();
        if(!response.ok)throw new Error(data.error||"No se pudo validar versión");
        return data.release;
      })
    ]).then(([app,release])=>{
      if(!mounted||!release)return;
      const current=Number(app.versionCode||0);
      const minimum=Number(release.minimumVersionCode||0);
      const latest=Number(release.latestVersionCode||0);
      const mandatory=current<minimum||(Boolean(release.forceUpdate)&&current<latest);
      setGate({
        blocked:mandatory,
        latest:current>=latest,
        message:mandatory
          ? "Esta versión de ManeComb ya no puede operar. Actualiza para continuar."
          : current<latest
            ? "Hay una versión más reciente de ManeComb disponible."
            : "Aplicación actualizada.",
        url:release.downloadUrl
      });
    }).catch(()=>undefined);
    return()=>{mounted=false};
  },[]);

  if(!gate||gate.latest)return null;

  if(gate.blocked){
    return <div style={{
      position:"fixed",inset:0,zIndex:99999,display:"grid",placeItems:"center",
      background:"rgba(8,10,14,.96)",padding:24
    }}>
      <div className="card grid" style={{maxWidth:520,width:"100%"}}>
        <span className="badge">ACTUALIZACIÓN OBLIGATORIA</span>
        <h2 style={{margin:0}}>Actualiza ManeComb</h2>
        <p className="muted">{gate.message}</p>
        {gate.url?<a className="btn" href={gate.url}>Descargar actualización</a>:null}
      </div>
    </div>;
  }

  const notice=<div className="card">
    <div className="status-row"><span>{gate.message}</span>{gate.url?<a className="btn secondary" href={gate.url}>Actualizar</a>:null}</div>
  </div>;
  return feedbackHost?createPortal(notice,feedbackHost):notice;
}
