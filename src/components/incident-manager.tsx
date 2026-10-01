"use client";

import { FormEvent,useCallback, useEffect, useMemo, useRef,useState } from "react";
import { UiModal } from "@/src/components/ui-modal";
import {useSocket,useSocketStatus} from "@/src/hooks/useSocket";
import {Icon} from "@/src/components/ui/icon";

type Incident={_id:string;type:string;status:string;message?:string;createdAt:string;latitude?:number;longitude?:number;vehicleId?:string};

export function IncidentManager(){
  const socket=useSocket(),connection=useSocketStatus(socket);
  const loadId=useRef(0);
  const [items,setItems]=useState<Incident[]>([]);
  const [state,setState]=useState("Cargando incidencias...");
  const [filter,setFilter]=useState<"active"|"open"|"acknowledged"|"resolved"|"all">("active");
  const [resolving,setResolving]=useState<Incident|null>(null);
  const [creating,setCreating]=useState(false);const [vehicles,setVehicles]=useState<Array<{_id:string;economicNumber:string}>>([]);
  const [busy,setBusy]=useState(false);const [loading,setLoading]=useState(true);const [error,setError]=useState("");

  const load=useCallback(async()=>{
    const current=++loadId.current;setLoading(true);
    try{const response=await fetch("/api/incidents",{cache:"no-store"});
    const data=await response.json();
    if(!response.ok)throw new Error(data.error||"No se pudieron cargar incidencias");
    if(current!==loadId.current)return;
    setItems(data.incidents||[]);
    setState((data.incidents||[]).filter((item:Incident)=>item.status!=="resolved").length+" abiertas");
    setError("");
    }catch{if(current===loadId.current)setError("No se pudieron cargar las incidencias. Revisa tu conexión o tu acceso.")}
    finally{if(current===loadId.current)setLoading(false)}
  },[]);

  useEffect(()=>{
    void load();const refresh=()=>void load();socket.on("connect",refresh);socket.on("incident:new",refresh);socket.on("incident:update",refresh);
    return()=>{loadId.current++;socket.off("connect",refresh);socket.off("incident:new",refresh);socket.off("incident:update",refresh)};
  },[load,socket]);
  useEffect(()=>{
    if(!creating)return;let active=true;
    void fetch("/api/vehicles").then(async response=>{if(!response.ok)throw new Error();const data=await response.json();if(active)setVehicles(data.vehicles||[])}).catch(()=>active&&setError("No se pudieron cargar las unidades. Puedes reportar sin asociar una unidad."));
    return()=>{active=false};
  },[creating]);

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
    if(busy)return;setBusy(true);setError("");
    try{const response=await fetch("/api/incidents/"+id,{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({status})});
    const data=await response.json();
    if(!response.ok){setError(data.error||"No se pudo actualizar");return}
    setResolving(null);setState(status==="resolved"?"Incidencia resuelta":"Incidencia reconocida");await load();
    }catch{setError("No se pudo actualizar la incidencia. Vuelve a intentar.")}
    finally{setBusy(false)}
  }
  async function create(event:FormEvent<HTMLFormElement>){
    event.preventDefault();if(busy)return;setBusy(true);setError("");
    const values=new FormData(event.currentTarget);
    try{
      const response=await fetch("/api/incidents",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({type:values.get("type"),message:values.get("message"),...(values.get("vehicleId")?{vehicleId:values.get("vehicleId")}:{})})});
      const data=await response.json();if(!response.ok)throw new Error(data.error||"No se pudo crear la incidencia");
      setCreating(false);await load();
    }catch{setError("No se pudo guardar la incidencia. Revisa tu conexión o tu acceso.")}
    finally{setBusy(false)}
  }

  return <div className="incident-center">
    <section className="entity-metrics incident-metrics">
      <div><small>Sin reconocer</small><strong>{loading?"—":metrics.open}</strong></div>
      <div><small>En seguimiento</small><strong>{loading?"—":metrics.acknowledged}</strong></div>
      <div><small>SOS activos</small><strong>{loading?"—":metrics.sos}</strong></div>
    </section>

    <div className="entity-toolbar">
      <div className="compact-filters incident-filters">
        {(["active","open","acknowledged","resolved","all"] as const).map(value=><button key={value} className={filter===value?"active":""} onClick={()=>setFilter(value)}>{value==="active"?"Activas":value==="open"?"Nuevas":value==="acknowledged"?"En seguimiento":value==="resolved"?"Resueltas":"Todas"}</button>)}
      </div>
      <span className="entity-state" role="status">{loading?"Cargando incidencias…":state} · {connection==="connected"?"En línea":"Reconectando"}</span>
      <button className="btn secondary" disabled={loading||busy} onClick={()=>void load()}>Actualizar</button>
      <button className="btn" disabled={busy} onClick={()=>{setError("");setCreating(true)}}>Nueva incidencia</button>
    </div>
    {error&&!creating&&!resolving?<p role="alert">{error}</p>:null}

    <div className="incident-list">
      {visible.map(item=>{
        const critical=item.type==="sos";
        return <article className={"incident-row "+(critical?"critical":"")} key={item._id}>
          <div className={"incident-type-icon "+(critical?"critical":"")}><Icon name="alert"/></div>
          <div className="incident-copy">
            <div><strong>{critical?"SOS":item.type.toUpperCase()}</strong><span className={"state-badge "+(item.status==="resolved"?"active":item.status==="acknowledged"?"maintenance":"archived")}>{item.status}</span></div>
            <p>{item.message||"Sin mensaje adicional"}</p>
            <small>{new Date(item.createdAt).toLocaleString()}{item.latitude!=null&&item.longitude!=null?" · "+item.latitude.toFixed(5)+", "+item.longitude.toFixed(5):" · sin coordenadas"}</small>
          </div>
          <div className="incident-actions">
            {item.status==="open"?<button disabled={busy} onClick={()=>void transition(item._id,"acknowledged")}>Reconocer</button>:null}
            {item.status!=="resolved"?<button disabled={busy} className="primary" onClick={()=>setResolving(item)}>Resolver</button>:null}
          </div>
        </article>;
      })}
      {!visible.length&&!loading&&!error?<div className="empty-state"><strong>Sin incidencias en esta vista</strong><span>La operación no tiene eventos que coincidan con el filtro.</span></div>:null}
    </div>

    <UiModal open={Boolean(resolving)} onClose={()=>{if(!busy)setResolving(null)}} title="Resolver incidencia" description="Confirma que el evento ya no requiere seguimiento operativo.">
      {error?<p role="alert">{error}</p>:null}
      <div className="confirmation-content">
        <span className={"confirmation-icon "+(resolving?.type==="sos"?"danger":"")}>✓</span>
        <div><strong>{resolving?.type==="sos"?"Cerrar SOS":"Cerrar incidencia"}</strong><p>{resolving?.message||"El evento quedará marcado como resuelto."}</p></div>
      </div>
      <div className="form-actions"><button className="btn secondary" disabled={busy} onClick={()=>setResolving(null)}>Cancelar</button><button className="btn" disabled={busy} onClick={()=>resolving&&void transition(resolving._id,"resolved")}>Confirmar resolución</button></div>
    </UiModal>
    <UiModal open={creating} onClose={()=>{if(!busy)setCreating(false)}} title="Nueva incidencia"><form className="form-stack" onSubmit={create}>
      {error?<p role="alert">{error}</p>:null}
      <label>Tipo<select name="type" className="input" required>{[["traffic","Tránsito"],["mechanical","Mecánica"],["accident","Accidente"],["police","Policía"],["robbery","Robo"],["medical","Médica"],["sos","SOS"],["other","Otra"]].map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
      <label>Unidad<select className="input" name="vehicleId"><option value="">Sin unidad asociada</option>{vehicles.map(vehicle=><option key={vehicle._id} value={vehicle._id}>{vehicle.economicNumber}</option>)}</select></label>
      <label>Descripción<textarea className="input" name="message" maxLength={1000} rows={4}/></label>
      <button className="btn" disabled={busy}>{busy?"Guardando…":"Guardar incidencia"}</button>
    </form></UiModal>
  </div>;
}
