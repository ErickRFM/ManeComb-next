"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { uploadManeCombFile } from "@/src/lib/client-upload";

type Vehicle = { _id: string; economicNumber: string };
type Driver = { _id: string; name: string; email: string };
type DocumentItem = {
  _id: string;
  ownerType: "driver" | "vehicle" | "organization";
  ownerId: string;
  kind: string;
  url: string;
  fileName?: string;
  status: "pending" | "approved" | "rejected";
  expiresAt?: string;
  createdAt?: string;
  rejectionReason?: string;
};

export function DocumentManager(){
  const [documents,setDocuments]=useState<DocumentItem[]>([]);
  const [vehicles,setVehicles]=useState<Vehicle[]>([]);
  const [drivers,setDrivers]=useState<Driver[]>([]);
  const [ownerType,setOwnerType]=useState<"organization"|"vehicle"|"driver">("organization");
  const [ownerId,setOwnerId]=useState("");
  const [kind,setKind]=useState("circulation");
  const [expiresAt,setExpiresAt]=useState("");
  const [state,setState]=useState("Cargando documentos...");
  const [busy,setBusy]=useState(false);
  const fileRef=useRef<HTMLInputElement|null>(null);

  async function load(){
    const [documentResponse,vehicleResponse,driverResponse]=await Promise.all([
      fetch("/api/documents"),
      fetch("/api/vehicles"),
      fetch("/api/drivers")
    ]);
    const [documentData,vehicleData,driverData]=await Promise.all([
      documentResponse.json().catch(()=>({})),
      vehicleResponse.json().catch(()=>({})),
      driverResponse.json().catch(()=>({}))
    ]);
    if(!documentResponse.ok)throw new Error(documentData.error||"No se pudieron cargar los documentos");
    if(!vehicleResponse.ok)throw new Error(vehicleData.error||"No se pudieron cargar las unidades");
    if(!driverResponse.ok)throw new Error(driverData.error||"No se pudieron cargar los conductores");
    setDocuments(documentData.documents||[]);
    setVehicles(vehicleData.vehicles||[]);
    setDrivers(driverData.drivers||[]);
    setState("");
  }

  useEffect(()=>{void load().catch((error)=>setState(error.message))},[]);

  const owners=useMemo(()=>{
    if(ownerType==="vehicle")return vehicles.map((vehicle)=>({id:String(vehicle._id),label:vehicle.economicNumber}));
    if(ownerType==="driver")return drivers.map((driver)=>({id:String(driver._id),label:driver.name+" · "+driver.email}));
    return [];
  },[ownerType,vehicles,drivers]);

  useEffect(()=>{setOwnerId(owners[0]?.id||"")},[ownerType,owners]);

  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    const file=fileRef.current?.files?.[0];
    if(!file)return setState("Selecciona un archivo");
    if(ownerType!=="organization"&&!ownerId)return setState("Selecciona el titular del documento");
    setBusy(true);
    setState("Cargando archivo...");
    try{
      const uploaded=await uploadManeCombFile(file,"document");
      setState("Guardando metadatos...");
      const response=await fetch("/api/documents",{
        method:"POST",
        headers:{"content-type":"application/json"},
        body:JSON.stringify({
          ownerType,
          ...(ownerType==="organization"?{}:{ownerId}),
          kind,
          expiresAt:expiresAt||undefined,
          url:uploaded.url,
          storagePublicId:uploaded.publicId,
          resourceType:uploaded.resourceType,
          bytes:uploaded.bytes,
          mimeType:uploaded.mimeType,
          fileName:uploaded.fileName
        })
      });
      const data=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(data.error||"No se pudo registrar el documento");
      if(fileRef.current)fileRef.current.value="";
      setExpiresAt("");
      setState("Documento cargado correctamente");
      await load();
    }catch(error){
      setState(error instanceof Error?error.message:"No se pudo cargar el documento");
    }finally{
      setBusy(false);
    }
  }

  return <div className="grid">
    <form className="card grid" onSubmit={submit}>
      <div className="grid grid-3">
        <label className="grid">Titular
          <select className="input" value={ownerType} onChange={(event)=>setOwnerType(event.target.value as typeof ownerType)}>
            <option value="organization">Empresa</option>
            <option value="vehicle">Unidad</option>
            <option value="driver">Conductor</option>
          </select>
        </label>
        <label className="grid">Tipo
          <select className="input" value={kind} onChange={(event)=>setKind(event.target.value)}>
            <option value="circulation">Tarjeta de circulación</option>
            <option value="license">Licencia</option>
            <option value="insurance">Seguro</option>
            <option value="ine">INE / identificación</option>
            <option value="other">Otro</option>
          </select>
        </label>
        <label className="grid">Vigencia
          <input className="input" type="date" value={expiresAt} onChange={(event)=>setExpiresAt(event.target.value)}/>
        </label>
      </div>
      {ownerType!=="organization"?<label className="grid">Asignar a
        <select className="input" value={ownerId} onChange={(event)=>setOwnerId(event.target.value)} required>
          {owners.map((owner)=><option key={owner.id} value={owner.id}>{owner.label}</option>)}
        </select>
      </label>:null}
      <input ref={fileRef} className="input" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" required/>
      <button className="btn" disabled={busy}>{busy?"Procesando...":"Cargar documento"}</button>
      {state?<p className="muted" style={{margin:0}}>{state}</p>:null}
    </form>

    <div className="grid">
      {documents.length?documents.map((document)=><article className="card" key={document._id}>
        <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"center",flexWrap:"wrap"}}>
          <div>
            <strong>{document.fileName||document.kind}</strong>
            <p className="muted" style={{margin:"4px 0 0"}}>{document.ownerType} · {document.status}{document.expiresAt?" · vence "+new Date(document.expiresAt).toLocaleDateString("es-MX"):""}</p>
          </div>
          <a className="btn" href={document.url} target="_blank" rel="noreferrer">Abrir</a>
        </div>
        {document.rejectionReason?<p style={{color:"#fb7185"}}>{document.rejectionReason}</p>:null}
      </article>):<div className="card muted">No hay documentos registrados.</div>}
    </div>
  </div>;
}
