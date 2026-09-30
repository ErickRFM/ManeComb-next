"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { uploadManeCombFile } from "@/src/lib/client-upload";
import { UiModal } from "@/src/components/ui-modal";

type Owner={_id:string;name?:string;economicNumber?:string;plates?:string};
type Doc={_id:string;ownerType:string;ownerId:string;kind:string;status:string;expiresAt?:string;rejectionReason?:string;bytes?:number;createdAt?:string};

const kindLabels:Record<string,string>={
  license:"Licencia",
  circulation:"Tarjeta de circulación",
  insurance:"Póliza de seguro",
  background:"Antecedentes",
  other:"Otro"
};

export function DocumentManager(){
  const [documents,setDocuments]=useState<Doc[]>([]);
  const [drivers,setDrivers]=useState<Owner[]>([]);
  const [vehicles,setVehicles]=useState<Owner[]>([]);
  const [ownerType,setOwnerType]=useState<"driver"|"vehicle"|"organization">("driver");
  const [state,setState]=useState("Cargando documentos...");
  const [busy,setBusy]=useState(false);
  const [uploadOpen,setUploadOpen]=useState(false);
  const [rejecting,setRejecting]=useState<Doc|null>(null);
  const [filter,setFilter]=useState<"all"|"pending"|"approved"|"rejected"|"expiring">("all");
  const [search,setSearch]=useState("");

  const load=useCallback(async()=>{
    const [docsResponse,ownersResponse]=await Promise.all([fetch("/api/documents"),fetch("/api/documents/owners")]);
    const [docsData,ownersData]=await Promise.all([docsResponse.json(),ownersResponse.json()]);
    if(!docsResponse.ok)throw new Error(docsData.error||"No se pudieron cargar documentos");
    if(!ownersResponse.ok)throw new Error(ownersData.error||"No se pudieron cargar propietarios");
    setDocuments(docsData.documents||[]);setDrivers(ownersData.drivers||[]);setVehicles(ownersData.vehicles||[]);
    setState((docsData.documents||[]).length+" documentos");
  },[]);

  useEffect(()=>{void load().catch(error=>setState(error.message))},[load]);

  const ownerName=useCallback((document:Doc)=>{
    if(document.ownerType==="organization")return "Empresa";
    const source=document.ownerType==="driver"?drivers:vehicles;
    const owner=source.find(item=>String(item._id)===String(document.ownerId));
    return owner?.name||owner?.economicNumber||document.ownerType;
  },[drivers,vehicles]);

  const metrics=useMemo(()=>{
    const now=Date.now(),limit=now+30*24*60*60*1000;
    return {
      pending:documents.filter(item=>item.status==="pending").length,
      approved:documents.filter(item=>item.status==="approved").length,
      rejected:documents.filter(item=>item.status==="rejected").length,
      expiring:documents.filter(item=>item.expiresAt&&new Date(item.expiresAt).getTime()>=now&&new Date(item.expiresAt).getTime()<=limit).length
    };
  },[documents]);

  const visible=useMemo(()=>{
    const q=search.trim().toLowerCase();
    const now=Date.now(),limit=now+30*24*60*60*1000;
    return documents.filter(item=>{
      const expiring=Boolean(item.expiresAt&&new Date(item.expiresAt).getTime()>=now&&new Date(item.expiresAt).getTime()<=limit);
      const statusMatch=filter==="all"||item.status===filter||(filter==="expiring"&&expiring);
      const text=(kindLabels[item.kind]||item.kind)+" "+ownerName(item);
      return statusMatch&&(!q||text.toLowerCase().includes(q));
    });
  },[documents,filter,search,ownerName]);

  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();setBusy(true);setState("Subiendo...");
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
      form.reset();setUploadOpen(false);setState("Documento enviado a revisión");await load();
    }catch(error){setState(error instanceof Error?error.message:"No se pudo subir")}
    finally{setBusy(false)}
  }

  async function review(id:string,status:"approved"|"rejected",rejectionReason?:string){
    const response=await fetch("/api/documents/"+id,{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({status,rejectionReason})});
    const data=await response.json();
    if(!response.ok){setState(data.error||"No se pudo revisar");return}
    setRejecting(null);setState(status==="approved"?"Documento aprobado":"Documento rechazado");await load();
  }

  const ownerOptions=ownerType==="driver"?drivers:vehicles;

  return <div className="document-center">
    <section className="entity-metrics document-metrics">
      <div><small>Pendientes</small><strong>{metrics.pending}</strong></div>
      <div><small>Aprobados</small><strong>{metrics.approved}</strong></div>
      <div><small>Por vencer</small><strong>{metrics.expiring}</strong></div>
    </section>

    <div className="entity-toolbar">
      <div className="entity-search"><span>⌕</span><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar tipo o propietario..."/></div>
      <div className="compact-filters">
        {(["all","pending","approved","rejected","expiring"] as const).map(value=><button key={value} className={filter===value?"active":""} onClick={()=>setFilter(value)}>{value==="all"?"Todos":value==="pending"?"Pendientes":value==="approved"?"Aprobados":value==="rejected"?"Rechazados":"Por vencer"}</button>)}
      </div>
      <button className="btn" onClick={()=>setUploadOpen(true)}>+ Documento</button>
    </div>

    <div className="document-grid">
      {visible.map(document=>{
        const expires=document.expiresAt?new Date(document.expiresAt):null;
        const days=expires?Math.ceil((expires.getTime()-Date.now())/(24*60*60*1000)):null;
        return <article className="document-card" key={document._id}>
          <div className="document-icon">DOC</div>
          <div className="document-card-main">
            <div className="document-card-head"><div><strong>{kindLabels[document.kind]||document.kind}</strong><small>{ownerName(document)}</small></div><span className={"state-badge "+(document.status==="approved"?"active":document.status==="rejected"?"archived":"maintenance")}>{document.status}</span></div>
            <div className="document-meta"><span>Vigencia <strong>{expires?expires.toLocaleDateString():"Sin vencimiento"}</strong></span>{days!==null&&days<=30&&days>=0?<span className="document-expiry">vence en {days} días</span>:null}</div>
            {document.rejectionReason?<div className="document-rejection">{document.rejectionReason}</div>:null}
          </div>
          <div className="document-actions">
            <a href={"/api/documents/"+document._id+"/download"} target="_blank" rel="noreferrer">Ver ↗</a>
            {document.status==="pending"?<><button onClick={()=>void review(document._id,"approved")}>Aprobar</button><button className="danger" onClick={()=>setRejecting(document)}>Rechazar</button></>:null}
          </div>
        </article>;
      })}
      {!visible.length?<div className="empty-state"><strong>Sin documentos en esta vista</strong><span>Cambia los filtros o registra un nuevo documento.</span></div>:null}
    </div>

    <UiModal open={uploadOpen} onClose={()=>setUploadOpen(false)} title="Nuevo documento" description="Asocia el archivo a una persona, unidad o a la empresa y registra su vigencia.">
      <form className="form-stack" onSubmit={submit}>
        <div className="form-grid-2">
          <label>Propietario<select className="input" value={ownerType} onChange={e=>setOwnerType(e.target.value as typeof ownerType)}><option value="driver">Conductor</option><option value="vehicle">Unidad</option><option value="organization">Empresa</option></select></label>
          {ownerType!=="organization"?<label>Selecciona<select className="input" name="ownerId" required><option value="">Selecciona</option>{ownerOptions.map(owner=><option key={owner._id} value={owner._id}>{owner.name||owner.economicNumber}{owner.plates?" · "+owner.plates:""}</option>)}</select></label>:<label>Propietario<input className="input" value="Empresa" readOnly/></label>}
          <label>Tipo<select className="input" name="kind" required>{Object.entries(kindLabels).map(([value,label])=><option value={value} key={value}>{label}</option>)}</select></label>
          <label>Vigencia<input className="input" type="date" name="expiresAt"/></label>
        </div>
        <label>Archivo<input className="input" type="file" name="file" accept="image/*,application/pdf" required/></label>
        <div className="form-actions"><button type="button" className="btn secondary" onClick={()=>setUploadOpen(false)}>Cancelar</button><button className="btn" disabled={busy}>{busy?"Subiendo...":"Guardar documento"}</button></div>
      </form>
    </UiModal>

    <UiModal open={Boolean(rejecting)} onClose={()=>setRejecting(null)} title="Rechazar documento" description="El motivo quedará visible en la trazabilidad documental.">
      <form className="form-stack" onSubmit={event=>{event.preventDefault();const reason=String(new FormData(event.currentTarget).get("reason")||"").trim();if(reason&&rejecting)void review(rejecting._id,"rejected",reason)}}>
        <label>Motivo<textarea className="input" name="reason" rows={5} required minLength={5} placeholder="Explica qué debe corregirse..."/></label>
        <div className="form-actions"><button type="button" className="btn secondary" onClick={()=>setRejecting(null)}>Cancelar</button><button className="btn danger">Rechazar</button></div>
      </form>
    </UiModal>
  </div>;
}
