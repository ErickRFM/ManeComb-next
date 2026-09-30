"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { UiModal } from "@/src/components/ui-modal";

type Incident={_id:string;type:string;status:string;message?:string;createdAt:string;latitude?:number;longitude?:number};

export function IncidentManager(){
  const [items,setItems]=useState<Incident[]>([]);
  const [state,setState]=useState("Cargando incidencias...");
  const [filter,setFilter]=useState<"active"|"open"|"acknowledged"|"resolved"|"all">("active");
  const [resolving,setResolving]=useState<Incident|null>(null);

  const load=useCallback(async()=>{
    const response=await fetch("/api/incidents");
    const data=await response.json();
    if(!response.ok)throw new Error(data.error||"No se pudieron cargar incidencias");
    setItems(data.incidents||[]);
    setState((data.incidents||[]).filter((item:Incident)=>item.status!=="resolved").length+" abiertas");
  },[]);

  useEffect(()=>{void load().catch(error=>setState(error.message))},[load]);

  const metrics=useMemo(()=>({
    open:items.filter(item=>item.status==="open").length,
    acknowledged:items.filter(item=>item.status==="acknowledged").length,
    sos:items.filter(item=>item.type==="sos"&&item.status!=="resolved").length,
    resolved:items.filter(item=>item.status==="resolved").length
  }),[items]);

  const visible=useMemo(()=>items.filter(item=>{
    if(filter==="all")return true;
    if(filter==="active")return item.status!=="resolved";
    return item.status===filter;
  }),[items,filter]);

  async function transition(id:string,status:"acknowledged"|"resolved"){
    const response=await fetch("/api/incidents/"+id,{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({status})});
    const data=await response.json();
    if(!response.ok){setState(data.error||"No se pudo actualizar");return}
    setResolving(null);setState(status==="resolved"?"Incidencia resuelta":"Incidencia reconocida");await load();
  }

  return <div className="incident-center">
    <section className="entity-metrics incident-metrics">
      <div><small>Sin reconocer</small><strong>{metrics.open}</strong></div>
      <div><small>En seguimiento</small><strong>{metrics.acknowledged}</strong></div>
      <div><small>SOS activos</small><strong>{metrics.sos}</strong></div>
    </section>

    <div className="entity-toolbar">
      <div className="compact-filters incident-filters">
        {(["active","open","acknowledged","resolved","all"] as const).map(value=><button key={value} className={filter===value?"active":""} onClick={()=>setFilter(value)}>{value==="active"?"Activas":value==="open"?"Nuevas":value==="acknowledged"?"En seguimiento":value==="resolved"?"Resueltas":"Todas"}</button>)}
      </div>
      <span className="entity-state">{state}</span>
      <button className="btn secondary" onClick={()=>void load()}>Actualizar</button>
    </div>

    <div className="incident-list">
      {visible.map(item=>{
        const critical=item.type==="sos";
        return <article className={"incident-row "+(critical?"critical":"")} key={item._id}>
          <div className={"incident-type-icon "+(critical?"critical":"")}><span>{critical?"!":"AL"}</span></div>
          <div className="incident-copy">
            <div><strong>{critical?"SOS":item.type.toUpperCase()}</strong><span className={"state-badge "+(item.status==="resolved"?"active":item.status==="acknowledged"?"maintenance":"archived")}>{item.status}</span></div>
            <p>{item.message||"Sin mensaje adicional"}</p>
            <small>{new Date(item.createdAt).toLocaleString()}{item.latitude!=null&&item.longitude!=null?" · "+item.latitude.toFixed(5)+", "+item.longitude.toFixed(5):" · sin coordenadas"}</small>
          </div>
          <div className="incident-actions">
            {item.status==="open"?<button onClick={()=>void transition(item._id,"acknowledged")}>Reconocer</button>:null}
            {item.status!=="resolved"?<button className="primary" onClick={()=>setResolving(item)}>Resolver</button>:null}
          </div>
        </article>;
      })}
      {!visible.length?<div className="empty-state"><strong>Sin incidencias en esta vista</strong><span>La operación no tiene eventos que coincidan con el filtro.</span></div>:null}
    </div>

    <UiModal open={Boolean(resolving)} onClose={()=>setResolving(null)} title="Resolver incidencia" description="Confirma que el evento ya no requiere seguimiento operativo.">
      <div className="confirmation-content">
        <span className={"confirmation-icon "+(resolving?.type==="sos"?"danger":"")}>✓</span>
        <div><strong>{resolving?.type==="sos"?"Cerrar SOS":"Cerrar incidencia"}</strong><p>{resolving?.message||"El evento quedará marcado como resuelto."}</p></div>
      </div>
      <div className="form-actions"><button className="btn secondary" onClick={()=>setResolving(null)}>Cancelar</button><button className="btn" onClick={()=>resolving&&void transition(resolving._id,"resolved")}>Confirmar resolución</button></div>
    </UiModal>
  </div>;
}
