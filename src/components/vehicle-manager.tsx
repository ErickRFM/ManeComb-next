"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { UiModal } from "@/src/components/ui-modal";

type Vehicle={_id:string;economicNumber:string;plates?:string;model?:string;capacity?:number;status:string};

export function VehicleManager(){
  const [vehicles,setVehicles]=useState<Vehicle[]>([]);
  const [status,setStatus]=useState("Cargando flota...");
  const [busy,setBusy]=useState(false);
  const [search,setSearch]=useState("");
  const [modalOpen,setModalOpen]=useState(false);
  const [editing,setEditing]=useState<Vehicle|null>(null);
  const [archiving,setArchiving]=useState<Vehicle|null>(null);
  const [archiveBusy,setArchiveBusy]=useState(false);
  const [archiveError,setArchiveError]=useState("");

  const load=useCallback(async()=>{
    const response=await fetch("/api/vehicles");
    const data=await response.json();
    if(!response.ok)throw new Error(data.error||"No se pudo cargar la flota");
    setVehicles(data.vehicles||[]);
    setStatus((data.vehicles||[]).filter((v:Vehicle)=>v.status!=="archived").length+" unidades activas");
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
    event.preventDefault();setBusy(true);
    const form=event.currentTarget;
    const raw=Object.fromEntries(new FormData(form).entries());
    const body={
      economicNumber:String(raw.economicNumber||"").trim(),
      plates:String(raw.plates||"").trim(),
      model:String(raw.model||"").trim(),
      capacity:raw.capacity?Number(raw.capacity):undefined
    };
    const response=await fetch(editing?"/api/vehicles/"+editing._id:"/api/vehicles",{
      method:editing?"PATCH":"POST",
      headers:{"content-type":"application/json"},
      body:JSON.stringify(body)
    });
    const data=await response.json();
    setBusy(false);
    if(!response.ok){setStatus(data.error||"No se pudo guardar");return}
    setModalOpen(false);setEditing(null);setStatus(editing?"Unidad actualizada":"Unidad agregada");await load();
  }

  async function updateStatus(vehicle:Vehicle,next:string){
    const response=await fetch("/api/vehicles/"+vehicle._id,{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({status:next})});
    const data=await response.json();
    if(!response.ok){setStatus(data.error||"No se pudo actualizar");return}
    await load();
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
      <div><small>Disponibles</small><strong>{metrics.active}</strong></div>
      <div><small>En ruta</small><strong>{metrics.running}</strong></div>
      <div><small>Mantenimiento</small><strong>{metrics.maintenance}</strong></div>
    </section>

    <div className="entity-toolbar">
      <div className="entity-search"><span>⌕</span><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar número, placas o modelo..."/></div>
      <span className="entity-state">{status}</span>
      <button className="btn" onClick={openCreate}>+ Nueva unidad</button>
    </div>

    <div className="entity-table">
      <div className="entity-table-row entity-table-head"><span>Unidad</span><span>Estado</span><span>Capacidad</span><span>Acciones</span></div>
      {visible.map(vehicle=><div className="entity-table-row" key={vehicle._id}>
        <div className="entity-primary"><span className="entity-avatar">{vehicle.economicNumber.replace(/[^A-Za-z0-9]/g,"").slice(-3)}</span><div><strong>{vehicle.economicNumber}</strong><small>{vehicle.plates||"Sin placas"} · {vehicle.model||"Sin modelo"}</small></div></div>
        <div><span className={"state-badge "+vehicle.status}>{vehicle.status}</span></div>
        <div className="entity-capacity"><strong>{vehicle.capacity||"—"}</strong><small>pasajeros</small></div>
        <div className="entity-actions">
          <button onClick={()=>openEdit(vehicle)}>Editar</button>
          {vehicle.status==="maintenance"?<button onClick={()=>void updateStatus(vehicle,"active")}>Reactivar</button>:vehicle.status!=="running"&&vehicle.status!=="archived"?<button onClick={()=>void updateStatus(vehicle,"maintenance")}>Mantenimiento</button>:null}
          {vehicle.status!=="running"&&vehicle.status!=="archived"?<button className="danger" onClick={()=>{setArchiveError("");setArchiving(vehicle)}}>Archivar</button>:null}
        </div>
      </div>)}
      {!visible.length?<div className="empty-state"><strong>No encontramos unidades</strong><span>Prueba con otra búsqueda o agrega una unidad.</span></div>:null}
    </div>

    <UiModal open={modalOpen} onClose={()=>setModalOpen(false)} title={editing?"Editar unidad":"Nueva unidad"} description={editing?"Actualiza los datos operativos sin cambiar su identidad histórica.":"Registra una unidad dentro del límite de tu plan."}>
      <form className="form-stack" onSubmit={save}>
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
