"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import {UiModal} from "@/src/components/ui-modal";

export function DriverManager(){
  const [drivers,setDrivers]=useState<any[]>([]);
  const [vehicles,setVehicles]=useState<any[]>([]);
  const [routes,setRoutes]=useState<any[]>([]);
  const [journeys,setJourneys]=useState<any[]>([]);
  const [state,setState]=useState("Cargando...");
  const [activation,setActivation]=useState("");
  const [search,setSearch]=useState("");
  const [busy,setBusy]=useState(false);const [error,setError]=useState("");const [loading,setLoading]=useState(true);
  const [editing,setEditing]=useState<any|null>(null);

  const load=useCallback(async()=>{
    setLoading(true);try{
    const responses=await Promise.all([fetch("/api/drivers"),fetch("/api/vehicles"),fetch("/api/routes"),fetch("/api/journeys")]);
    const payloads=await Promise.all(responses.map(r=>r.json()));
    responses.forEach((r,i)=>{if(!r.ok)throw new Error(payloads[i].error||"No se pudo cargar el módulo")});
    setDrivers(payloads[0].drivers||[]);setVehicles(payloads[1].vehicles||[]);setRoutes(payloads[2].routes||[]);setJourneys(payloads[3].journeys||[]);
    setState((payloads[0].drivers||[]).length+" conductores");setError("");
    }catch{setError("No se pudo cargar el módulo. Revisa tu conexión o tu acceso.")}finally{setLoading(false)}
  },[]);

  useEffect(()=>{void load().catch(error=>setState(error.message))},[load]);

  const activeJourneys=journeys.filter(j=>!["FINISHED","CANCELLED"].includes(j.state));
  const availableVehicles=vehicles.filter(v=>v.status==="active");
  const visibleDrivers=useMemo(()=>{
    const q=search.trim().toLowerCase();
    return drivers.filter(driver=>!q||driver.name.toLowerCase().includes(q)||driver.email.toLowerCase().includes(q));
  },[drivers,search]);

  async function mutate(path:string,method:string,body:unknown){
    if(busy)return null;setBusy(true);setError("");
    try{
      const response=await fetch(path,{method,headers:{"content-type":"application/json"},body:JSON.stringify(body)});
      const data=await response.json();if(!response.ok)throw new Error(data.error||"No se pudo guardar");return data;
    }catch(error){setError(error instanceof Error?error.message:"No se pudo guardar. Vuelve a intentar.");return null}
    finally{setBusy(false)}
  }
  async function createDriver(event:FormEvent<HTMLFormElement>){
    event.preventDefault();const form=event.currentTarget;
    const data=await mutate("/api/drivers","POST",Object.fromEntries(new FormData(form).entries()));
    if(data){form.reset();await load()}
  }
  async function createActivation(driverId:string){
    setActivation("");const data=await mutate("/api/activation-keys","POST",{driverId,ttlHours:72});
    if(data){setActivation(data.code);setState("Llave válida hasta "+new Date(data.expiresAt).toLocaleString())}
  }
  async function assign(event:FormEvent<HTMLFormElement>){
    event.preventDefault();const form=event.currentTarget;const raw=Object.fromEntries(new FormData(form).entries());
    const data=await mutate("/api/journeys","PUT",{driverId:raw.driverId,vehicleId:raw.vehicleId,...(raw.routeId?{routeId:raw.routeId}:{})});
    if(data){form.reset();await load()}
  }
  async function toggle(driver:any){
    if(await mutate("/api/drivers/"+driver._id,"PATCH",{active:!driver.active}))await load();
  }
  async function edit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();if(!editing)return;
    const raw=Object.fromEntries(new FormData(event.currentTarget).entries());
    if(await mutate("/api/drivers/"+editing._id,"PATCH",{name:raw.name,email:raw.email})){setEditing(null);await load()}
  }

  return <div className="entity-manager">
    <section className="entity-metrics">
      <div><small>Conductores activos</small><strong>{drivers.filter(d=>d.active).length}</strong></div>
      <div><small>Jornadas abiertas</small><strong>{activeJourneys.length}</strong></div>
      <div><small>Unidades disponibles</small><strong>{availableVehicles.length}</strong></div>
    </section>

    {activation?<div className="activation-banner"><div><span className="eyebrow">LLAVE DE ACTIVACIÓN</span><strong>{activation}</strong><small>Compártela una sola vez con el conductor. Caduca automáticamente.</small></div><button className="btn secondary" onClick={()=>void navigator.clipboard?.writeText(activation).then(()=>setState("Llave copiada")).catch(()=>setError("No se pudo copiar; selecciona la llave manualmente."))}>Copiar</button></div>:null}

    <fieldset disabled={busy} className="route-editor-fields"><div className="driver-management-grid">
      <form className="management-form" onSubmit={createDriver}>
        <div className="management-form-head"><span>01</span><div><strong>Nuevo conductor</strong><small>Crea la cuenta operativa</small></div></div>
        <label>Nombre<input className="input" name="name" placeholder="Nombre completo" required/></label>
        <label>Correo<input className="input" name="email" type="email" placeholder="conductor@empresa.mx" required/></label>
        <label>Clave temporal<input className="input" name="pin" type="password" minLength={8} placeholder="8 caracteres o más" required/></label>
        <button className="btn">Crear conductor</button>
      </form>

      <form className="management-form" onSubmit={assign}>
        <div className="management-form-head"><span>02</span><div><strong>Asignar jornada</strong><small>Une conductor, unidad y ruta</small></div></div>
        <label>Conductor<select className="input" name="driverId" required><option value="">Selecciona</option>{drivers.filter(d=>d.active).map(d=><option key={d._id} value={d._id}>{d.name}</option>)}</select></label>
        <label>Unidad<select className="input" name="vehicleId" required><option value="">Selecciona</option>{vehicles.filter(v=>v.status==="active").map(v=><option key={v._id} value={v._id}>{v.economicNumber}</option>)}</select></label>
        <label>Ruta<select className="input" name="routeId"><option value="">Sin ruta</option>{routes.filter(r=>r.status==="active").map(r=><option key={r._id} value={r._id}>{r.name}</option>)}</select></label>
        <button className="btn">Asignar jornada</button>
      </form>
    </div>

    </fieldset>
    <div className="entity-toolbar">
      <div className="entity-search"><span>⌕</span><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar conductor..." aria-label="Buscar conductor"/></div>
      <span className="entity-state" role="status">{loading?"Cargando conductores…":busy?"Guardando…":state}</span><button className="btn secondary" disabled={busy||loading} onClick={()=>void load()}>Actualizar conductores</button>
    </div>

    {error&&!editing?<p role="alert">{error}</p>:null}
    <div className="entity-table driver-entity-table">
      <div className="entity-table-row entity-table-head"><span>Conductor</span><span>Estado</span><span>Operación</span><span>Acciones</span></div>
      {visibleDrivers.map(driver=>{
        const activeJourney=activeJourneys.find(j=>String(j.driverId)===String(driver._id));
        return <div className="entity-table-row" key={driver._id}>
          <div className="entity-primary"><span className="entity-avatar person">{driver.name.split(/\s+/).slice(0,2).map((p:string)=>p[0]).join("").toUpperCase()}</span><div><strong>{driver.name}</strong><small>{driver.email}</small></div></div>
          <div><span className={"state-badge "+(driver.active?"active":"archived")}>{driver.active?"activo":"inactivo"}</span></div>
          <div className="entity-capacity"><strong>{activeJourney?activeJourney.state:"Disponible"}</strong><small>{activeJourney?"jornada "+String(activeJourney._id).slice(-5):"sin jornada"}</small></div>
          <div className="entity-actions">
            <button disabled={busy} onClick={()=>{setError("");setEditing(driver)}}>Editar conductor</button>
            <button onClick={()=>void createActivation(driver._id)} disabled={!driver.active||busy}>Activar app</button>
            <button disabled={busy} className={!driver.active?"":"danger"} onClick={()=>void toggle(driver)}>{driver.active?"Desactivar":"Reactivar"}</button>
          </div>
        </div>;
      })}
    </div>
    <UiModal open={Boolean(editing)} title="Editar conductor" onClose={()=>{if(!busy)setEditing(null)}}>
      <form className="form-stack" onSubmit={edit}>
        {error?<p role="alert">{error}</p>:null}
        <label>Nombre<input className="input" name="name" defaultValue={editing?.name||""} required minLength={2}/></label>
        <label>Correo<input className="input" type="email" name="email" defaultValue={editing?.email||""} required/></label>
        <button className="btn" disabled={busy}>{busy?"Guardando…":"Guardar conductor"}</button>
      </form>
    </UiModal>
  </div>;
}
