"use client";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { uploadManeCombFile } from "@/src/lib/client-upload";

type Owner={_id:string;name?:string;economicNumber?:string;plates?:string};
type Doc={_id:string;ownerType:string;ownerId:string;kind:string;status:string;expiresAt?:string;rejectionReason?:string;bytes?:number};

export function DocumentManager(){
  const [documents,setDocuments]=useState<Doc[]>([]);
  const [drivers,setDrivers]=useState<Owner[]>([]);
  const [vehicles,setVehicles]=useState<Owner[]>([]);
  const [ownerType,setOwnerType]=useState<"driver"|"vehicle"|"organization">("driver");
  const [state,setState]=useState("Cargando...");
  const [busy,setBusy]=useState(false);

  const load=useCallback(async()=>{
    const [docsResponse,ownersResponse]=await Promise.all([fetch("/api/documents"),fetch("/api/documents/owners")]);
    const [docsData,ownersData]=await Promise.all([docsResponse.json(),ownersResponse.json()]);
    if(!docsResponse.ok)throw new Error(docsData.error||"No se pudieron cargar documentos");
    if(!ownersResponse.ok)throw new Error(ownersData.error||"No se pudieron cargar propietarios");
    setDocuments(docsData.documents||[]);
    setDrivers(ownersData.drivers||[]);
    setVehicles(ownersData.vehicles||[]);
    setState((docsData.documents||[]).length+" documentos");
  },[]);

  useEffect(()=>{void load().catch(error=>setState(error.message))},[load]);

  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    setBusy(true);
    setState("Subiendo...");
    try{
      const form=event.currentTarget;
      const data=new FormData(form);
      const file=data.get("file");
      if(!(file instanceof File)||file.size===0)throw new Error("Selecciona un archivo");
      const uploaded=await uploadManeCombFile(file,"document");
      const body={
        ownerType,
        ownerId:ownerType==="organization"?undefined:String(data.get("ownerId")||""),
        kind:String(data.get("kind")||"other"),
        url:uploaded.url,
        storagePublicId:uploaded.publicId,
        resourceType:uploaded.resourceType,
        bytes:uploaded.bytes,
        expiresAt:data.get("expiresAt")?String(data.get("expiresAt")):undefined
      };
      const response=await fetch("/api/documents",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});
      const result=await response.json();
      if(!response.ok)throw new Error(result.error||"No se pudo registrar el documento");
      form.reset();
      setState("Documento enviado a revisión");
      await load();
    }catch(error){setState(error instanceof Error?error.message:"No se pudo subir")}
    finally{setBusy(false)}
  }

  async function review(id:string,status:"approved"|"rejected"){
    const rejectionReason=status==="rejected"?(window.prompt("Motivo del rechazo")||"").trim():undefined;
    if(status==="rejected"&&!rejectionReason)return;
    const response=await fetch("/api/documents/"+id,{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({status,rejectionReason})});
    const data=await response.json();
    if(!response.ok)return setState(data.error||"No se pudo revisar");
    await load();
  }

  const ownerOptions=ownerType==="driver"?drivers:vehicles;

  return <div className="grid">
    <form className="card grid" onSubmit={submit}>
      <div className="status-row"><strong>Nuevo documento</strong><span className="muted">{state}</span></div>
      <div className="grid grid-3">
        <select className="input" value={ownerType} onChange={(e)=>setOwnerType(e.target.value as any)}>
          <option value="driver">Conductor</option><option value="vehicle">Unidad</option><option value="organization">Empresa</option>
        </select>
        {ownerType!=="organization"?<select className="input" name="ownerId" required><option value="">Selecciona propietario</option>{ownerOptions.map(owner=><option key={owner._id} value={owner._id}>{owner.name||owner.economicNumber}{owner.plates?" · "+owner.plates:""}</option>)}</select>:<input className="input" value="Documento de empresa" readOnly/>}
        <select className="input" name="kind" required>
          <option value="license">Licencia</option><option value="circulation">Tarjeta de circulación</option><option value="insurance">Póliza de seguro</option><option value="background">Antecedentes</option><option value="other">Otro</option>
        </select>
      </div>
      <div className="grid grid-3">
        <input className="input" type="date" name="expiresAt"/>
        <input className="input" type="file" name="file" accept="image/*,application/pdf" required/>
        <button className="btn" disabled={busy}>{busy?"Subiendo...":"Subir documento"}</button>
      </div>
    </form>

    <div className="grid grid-3">{documents.map(document=><div className="card grid" key={document._id}>
      <div className="status-row"><strong>{document.kind}</strong><span className="badge">{document.status}</span></div>
      <p className="muted">Propietario: {document.ownerType}</p>
      <p className="muted">Vence: {document.expiresAt?new Date(document.expiresAt).toLocaleDateString():"Sin vigencia"}</p>
      {document.rejectionReason?<p style={{color:"#fb7185"}}>{document.rejectionReason}</p>:null}
      <a className="btn secondary" href={"/api/documents/"+document._id+"/download"} target="_blank" rel="noreferrer">Ver archivo</a>
      {document.status==="pending"?<div style={{display:"flex",gap:8}}><button className="btn" onClick={()=>void review(document._id,"approved")}>Aprobar</button><button className="btn secondary" onClick={()=>void review(document._id,"rejected")}>Rechazar</button></div>:null}
    </div>)}</div>
  </div>
}
