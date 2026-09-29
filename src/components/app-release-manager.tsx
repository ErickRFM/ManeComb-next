"use client";
import { FormEvent, useEffect, useState } from "react";

export function AppReleaseManager(){
  const [release,setRelease]=useState<any>(null);
  const [state,setState]=useState("Cargando...");

  useEffect(()=>{
    fetch("/api/admin/app-releases/android").then(async response=>{
      const data=await response.json();
      if(!response.ok)throw new Error(data.error||"No se pudo cargar");
      setRelease(data.release);
      setState(data.release?"Release cargado":"Sin release publicado");
    }).catch(error=>setState(error.message));
  },[]);

  async function save(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    const form=event.currentTarget;
    const raw=Object.fromEntries(new FormData(form).entries());
    const body={
      latestVersion:String(raw.latestVersion),
      minimumVersion:String(raw.minimumVersion),
      latestVersionCode:Number(raw.latestVersionCode),
      minimumVersionCode:Number(raw.minimumVersionCode),
      downloadUrl:String(raw.downloadUrl),
      notes:String(raw.notes||""),
      forceUpdate:raw.forceUpdate==="on"
    };
    const response=await fetch("/api/admin/app-releases/android",{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify(body)});
    const data=await response.json();
    if(!response.ok)return setState(data.error||"No se pudo guardar");
    setRelease(data.release);
    setState("Release publicado");
  }

  return <form className="card grid" onSubmit={save}>
    <div className="status-row"><strong>Android / APK</strong><span className="muted">{state}</span></div>
    <div className="grid grid-3">
      <label>Última versión<input className="input" name="latestVersion" defaultValue={release?.latestVersion||"1.0.0"} required/></label>
      <label>Versión mínima<input className="input" name="minimumVersion" defaultValue={release?.minimumVersion||"1.0.0"} required/></label>
      <label>URL de descarga<input className="input" name="downloadUrl" type="url" defaultValue={release?.downloadUrl||""} required/></label>
      <label>Último versionCode<input className="input" name="latestVersionCode" type="number" min="1" defaultValue={release?.latestVersionCode||1} required/></label>
      <label>versionCode mínimo<input className="input" name="minimumVersionCode" type="number" min="1" defaultValue={release?.minimumVersionCode||1} required/></label>
      <label style={{alignSelf:"end"}}><input name="forceUpdate" type="checkbox" defaultChecked={Boolean(release?.forceUpdate)}/> Forzar actualización</label>
    </div>
    <textarea className="input" name="notes" rows={6} defaultValue={release?.notes||""} placeholder="Notas de versión"/>
    <button className="btn">Publicar directiva</button>
  </form>
}
