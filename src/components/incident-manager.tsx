"use client";
import { useCallback, useEffect, useState } from "react";
type Incident={_id:string;type:string;status:string;message?:string;createdAt:string;latitude?:number;longitude?:number};

export function IncidentManager(){
  const [items,setItems]=useState<Incident[]>([]);
  const [state,setState]=useState("Cargando...");
  const load=useCallback(async()=>{
    const response=await fetch("/api/incidents");
    const data=await response.json();
    if(!response.ok)throw new Error(data.error||"No se pudieron cargar incidencias");
    setItems(data.incidents||[]);
    setState((data.incidents||[]).filter((x:Incident)=>x.status!=="resolved").length+" abiertas");
  },[]);
  useEffect(()=>{void load().catch(e=>setState(e.message))},[load]);

  async function transition(id:string,status:"acknowledged"|"resolved"){
    const response=await fetch("/api/incidents/"+id,{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({status})});
    const data=await response.json();
    if(!response.ok)return setState(data.error||"No se pudo actualizar");
    await load();
  }

  return <div className="grid">
    <div className="status-row"><span className="muted">{state}</span><button className="btn secondary" onClick={()=>void load()}>Actualizar</button></div>
    {items.length===0?<div className="card muted">Sin incidencias.</div>:items.map(item=><div className="card" key={item._id}>
      <div className="status-row"><div><strong>{item.type.toUpperCase()}</strong><p className="muted" style={{marginBottom:0}}>{item.message||"Sin mensaje"} · {new Date(item.createdAt).toLocaleString()}</p></div><span className="badge">{item.status}</span></div>
      {item.status!=="resolved"?<div style={{display:"flex",gap:8,marginTop:14}}>
        {item.status==="open"?<button className="btn secondary" onClick={()=>void transition(item._id,"acknowledged")}>Reconocer</button>:null}
        <button className="btn" onClick={()=>void transition(item._id,"resolved")}>Resolver</button>
      </div>:null}
    </div>)}
  </div>
}
