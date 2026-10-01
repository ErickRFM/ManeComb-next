"use client";
import {Icon} from "@/src/components/ui/icon";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { UiModal } from "@/src/components/ui-modal";
import {usePortalPermission} from "@/src/hooks/usePortalPermission";

type Vehicle={_id:string;economicNumber:string;plates?:string;model?:string;capacity?:number;status:string};

export function VehicleManager(){
  const canEdit=usePortalPermission("manage_vehicles");
  const [vehicles,setVehicles]=useState<Vehicle[]>([]);
  const [status,setStatus]=useState("Cargando flota...");
  const [busy,setBusy]=useState(false);
  const [search,setSearch]=useState("");
  const [modalOpen,setModalOpen]=useState(false);
  const [editing,setEditing]=useState<Vehicle|null>(null);
  const [archiving,setArchiving]=useState<Vehicle|null>(null);
  const [archiveBusy,setArchiveBusy]=useState(false);
  const [archiveError,setArchiveError]=useState("");
  const [error,setError]=useState("");
  const [loading,setLoading]=useState(true);

  const load=useCallback(async()=>{
    setLoading(true);
    try{
    const response=await fetch("/api/vehicles");
    const data=await response.json();
    if(!response.ok)throw new Error(data.error||"No se pudo cargar la flota");
    setVehicles(data.vehicles||[]);
    setStatus((data.vehicles||[]).filter((v:Vehicle)=>v.status!=="archived").length+" unidades activas");
    setError("");
    }catch{setError("No se pudo cargar la flota. Revisa tu conexión o tu acceso.")}
    finally{setLoading(false)}
  },[]);

  useEffect(()=>{void load().catch(error=>setStatus(error.message))},[load]);

  const visible=useMemo(()=>{
    const q=search.trim().toLowerCase();
    return vehicles.filter(vehicle=>!q||vehicle.economicNumber.toLowerCase().includes(q)||(vehicle.plates||"").toLowerCase().includes(q)||(vehicle.model||"").toLowerCase().includes(q));
  },[vehicles,search]);

  const metrics=useMemo(()=>({
    active:vehicles.filter(v=>v.status==="active").length,
    running:vehicles.filter(v=>v.status==="running").length,
    maintenance:vehicles.filter(v=>v.status==="maintenance").length
  }),[vehicles]);

  function openCreate(){setEditing(null);setModalOpen(true)}
  function openEdit(vehicle:Vehicle){setEditing(vehicle);setModalOpen(true)}

  async function save(event:FormEvent<HTMLFormElement>){
    event.preventDefault();if(busy)return;setBusy(true);setError("");
    const form=event.currentTarget;
    const raw=Object.fromEntries(new FormData(form).entries());
    const body={
      economicNumber:String(raw.economicNumber||"").trim(),
      plates:String(raw.plates||"").trim(),
      model:String(raw.model||"").trim(),
      capacity:raw.capacity?Number(raw.capacity):undefined
    };
    try{const response=await fetch(editing?"/api/vehicles/"+editing._id:"/api/vehicles",{
      method:editing?"PATCH":"POST",
      headers:{"content-type":"application/json"},
      body:JSON.stringify(body)
    });
    const data=await response.json();
    if(!response.ok){setError(data.error||"No se pudo guardar");return}
    setModalOpen(false);setEditing(null);setStatus(editing?"Unidad actualizada":"Unidad agregada");await load();
    }catch{setError("No se pudo guardar la unidad. Revisa la conexión y vuelve a intentar.")}
    finally{setBusy(false)}
  }

  async function updateStatus(vehicle:Vehicle,next:string){
    if(busy)return;setBusy(true);setError("");
    try{const response=await fetch("/api/vehicles/"+vehicle._id,{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({status:next})});
    const data=await response.json();
    if(!response.ok){setError(data.error||"No se pudo actualizar");return}
    await load();
    }catch{setError("No se pudo actualizar la unidad. Vuelve a intentar.")}
    finally{setBusy(false)}
  }

  async function archiveVehicle(){
    if(!archiving||archiveBusy)return;
    setArchiveBusy(true);setArchiveError("");
    try{
      const response=await fetch("/api/vehicles/"+archiving._id,{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({status:"archived"})});
      const data=await response.json();
      if(!response.ok)throw new Error(data.error||"No se pudo archivar la unidad");
      setArchiving(null);
      await load().catch(error=>setStatus(error.message));
    }catch(error){setArchiveError(error instanceof Error?error.message:"No se pudo archivar la unidad")}
    finally{setArchiveBusy(false)}
  }

  return <div className="entity-manager">
    <section className="entity-metrics">
      <div><small>Disponibles</small><strong>{loading?"—":metrics.active}</strong></div>
      <div><small>En ruta</small><strong>{loading?"—":metrics.running}</strong></div>
      <div><small>Mantenimiento</small><strong>{loading?"—":metrics.maintenance}</strong></div>
    </section>

    <div className="entity-toolbar">
      <div className="entity-search"><span><Icon name="search" size={16}/></span><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar número, placas o modelo..." aria-label="Buscar unidad"/></div>
      <span className="entity-state" role="status">{loading?"Cargando flota…":status}</span>
      <button className="btn secondary" disabled={loading||busy} onClick={()=>void load()}>Actualizar flota</button>
      {canEdit?<button className="btn" onClick={openCreate}>+ Nueva unidad</button>:null}
    </div>

    <div className="entity-table">
      <div className="entity-table-row entity-table-head"><span>Unidad</span><span>Estado</span><span>Capacidad</span><span>Acciones</span></div>
      {visible.map(vehicle=><div className="entity-table-row" key={vehicle._id}>
        <div className="entity-primary"><span className="entity-avatar">{vehicle.economicNumber.replace(/[^A-Za-z0-9]/g,"").slice(-3)}</span><div><strong>{vehicle.economicNumber}</strong><small>{vehicle.plates||"Sin placas"} · {vehicle.model||"Sin modelo"}</small></div></div>
        <div><span className={"state-badge "+vehicle.status}>{vehicle.status}</span></div>
        <div className="entity-capacity"><strong>{vehicle.capacity||"—"}</strong><small>pasajeros</small></div>
        {canEdit?<div className="entity-actions">
          <button onClick={()=>openEdit(vehicle)}>Editar</button>
          {["maintenance","archived"].includes(vehicle.status)?<button disabled={busy} onClick={()=>void updateStatus(vehicle,"active")}>Reactivar</button>:vehicle.status!=="running"?<button disabled={busy} onClick={()=>void updateStatus(vehicle,"maintenance")}>Mantenimiento</button>:null}
          {vehicle.status!=="running"&&vehicle.status!=="archived"?<button className="danger" onClick={()=>{setArchiveError("");setArchiving(vehicle)}}>Archivar</button>:null}
        </div>:null}
      </div>)}
      {!visible.length&&!loading&&!error?<div className="empty-state"><strong>No encontramos unidades</strong><span>Prueba con otra búsqueda o agrega una unidad.</span></div>:null}
    </div>
    {error&&!modalOpen?<p role="alert">{error}</p>:null}

    <UiModal open={modalOpen} onClose={()=>setModalOpen(false)} title={editing?"Editar unidad":"Nueva unidad"} description={editing?"Actualiza los datos operativos sin cambiar su identidad histórica.":"Registra una unidad dentro del límite de tu plan."}>
      <form className="form-stack" onSubmit={save}>
        {error?<p role="alert">{error}</p>:null}
        <div className="form-grid-2">
          <label>Número económico<input className="input" name="economicNumber" defaultValue={editing?.economicNumber||""} required/></label>
          <label>Placas<input className="input" name="plates" defaultValue={editing?.plates||""} placeholder="ABC-123"/></label>
          <label>Modelo<input className="input" name="model" defaultValue={editing?.model||""} placeholder="Nissan Urvan"/></label>
          <label>Capacidad<input className="input" name="capacity" type="number" min="1" max="100" defaultValue={editing?.capacity||""} placeholder="18"/></label>
        </div>
        <div className="form-actions"><button type="button" className="btn secondary" onClick={()=>setModalOpen(false)}>Cancelar</button><button className="btn" disabled={busy}>{busy?"Guardando...":editing?"Guardar cambios":"Agregar unidad"}</button></div>
      </form>
    </UiModal>
    <UiModal open={Boolean(archiving)} onClose={()=>{if(!archiveBusy)setArchiving(null)}} title="Archivar unidad" description={"¿Archivar la unidad "+(archiving?.economicNumber||"")+"? Su historial se conserva."}>
      {archiveError?<p role="alert">{archiveError}</p>:null}
      <div className="form-actions"><button type="button" className="btn secondary" disabled={archiveBusy} onClick={()=>setArchiving(null)}>Cancelar</button><button type="button" className="btn" disabled={archiveBusy} onClick={()=>void archiveVehicle()}>{archiveBusy?"Archivando...":"Archivar unidad"}</button></div>
    </UiModal>
  </div>;
}
