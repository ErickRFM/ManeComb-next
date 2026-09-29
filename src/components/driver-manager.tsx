"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

export function DriverManager(){
  const [drivers,setDrivers]=useState<any[]>([]);
  const [vehicles,setVehicles]=useState<any[]>([]);
  const [routes,setRoutes]=useState<any[]>([]);
  const [journeys,setJourneys]=useState<any[]>([]);
  const [state,setState]=useState("Cargando...");
  const [activation,setActivation]=useState("");
  const [search,setSearch]=useState("");

  const load=useCallback(async()=>{
    const responses=await Promise.all([fetch("/api/drivers"),fetch("/api/vehicles"),fetch("/api/routes"),fetch("/api/journeys")]);
    const payloads=await Promise.all(responses.map(r=>r.json()));
    responses.forEach((r,i)=>{if(!r.ok)throw new Error(payloads[i].error||"No se pudo cargar el módulo")});
    setDrivers(payloads[0].drivers||[]);setVehicles(payloads[1].vehicles||[]);setRoutes(payloads[2].routes||[]);setJourneys(payloads[3].journeys||[]);
    setState((payloads[0].drivers||[]).length+" conductores");
  },[]);

  useEffect(()=>{void load().catch(error=>setState(error.message))},[load]);

  const activeJourneys=journeys.filter(j=>!["FINISHED","CANCELLED"].includes(j.state));
  const availableVehicles=vehicles.filter(v=>v.status==="active");
  const visibleDrivers=useMemo(()=>{
    const q=search.trim().toLowerCase();
    return drivers.filter(driver=>!q||driver.name.toLowerCase().includes(q)||driver.email.toLowerCase().includes(q));
  },[drivers,search]);

  async function createDriver(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    const form=event.currentTarget;
    const body=Object.fromEntries(new FormData(form).entries());
    const response=await fetch("/api/drivers",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});
    const data=await response.json();
    if(!response.ok)return setState(data.error||"No se pudo crear conductor");
    form.reset();setState("Conductor creado");await load();
  }

  async function createActivation(driverId:string){
    setActivation("");
    const response=await fetch("/api/activation-keys",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({driverId,ttlHours:72})});
    const data=await response.json();
    if(!response.ok)return setState(data.error||"No se pudo generar llave");
    setActivation(data.code);setState("Llave válida hasta "+new Date(data.expiresAt).toLocaleString());
  }

  async function assign(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    const form=event.currentTarget;
    const raw=Object.fromEntries(new FormData(form).entries());
    const body={driverId:raw.driverId,vehicleId:raw.vehicleId,...(raw.routeId?{routeId:raw.routeId}:{})};
    const response=await fetch("/api/journeys",{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify(body)});
    const data=await response.json();
    if(!response.ok)return setState(data.error||"No se pudo asignar jornada");
    form.reset();setState("Jornada asignada");await load();
  }

  async function toggle(driver:any){
    const response=await fetch("/api/drivers/"+driver._id,{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({active:!driver.active})});
    const data=await response.json();
    if(!response.ok)return setState(data.error||"No se pudo actualizar");
    await load();
  }

  return <div className="entity-manager">
    <section className="entity-metrics">
      <div><small>Conductores activos</small><strong>{drivers.filter(d=>d.active).length}</strong></div>
      <div><small>Jornadas abiertas</small><strong>{activeJourneys.length}</strong></div>
      <div><small>Unidades disponibles</small><strong>{availableVehicles.length}</strong></div>
    </section>

    {activation?<div className="activation-banner"><div><span className="eyebrow">LLAVE DE ACTIVACIÓN</span><strong>{activation}</strong><small>Compártela una sola vez con el conductor. Caduca automáticamente.</small></div><button className="btn secondary" onClick={()=>void navigator.clipboard?.writeText(activation)}>Copiar</button></div>:null}

    <div className="driver-management-grid">
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

    <div className="entity-toolbar">
      <div className="entity-search"><span>⌕</span><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar conductor..."/></div>
      <span className="entity-state">{state}</span>
    </div>

    <div className="entity-table driver-entity-table">
      <div className="entity-table-row entity-table-head"><span>Conductor</span><span>Estado</span><span>Operación</span><span>Acciones</span></div>
      {visibleDrivers.map(driver=>{
        const activeJourney=activeJourneys.find(j=>String(j.driverId)===String(driver._id));
        return <div className="entity-table-row" key={driver._id}>
          <div className="entity-primary"><span className="entity-avatar person">{driver.name.split(/\s+/).slice(0,2).map((p:string)=>p[0]).join("").toUpperCase()}</span><div><strong>{driver.name}</strong><small>{driver.email}</small></div></div>
          <div><span className={"state-badge "+(driver.active?"active":"archived")}>{driver.active?"activo":"inactivo"}</span></div>
          <div className="entity-capacity"><strong>{activeJourney?activeJourney.state:"Disponible"}</strong><small>{activeJourney?"jornada "+String(activeJourney._id).slice(-5):"sin jornada"}</small></div>
          <div className="entity-actions">
            <button onClick={()=>void createActivation(driver._id)} disabled={!driver.active}>Activar app</button>
            <button className={!driver.active?"":"danger"} onClick={()=>void toggle(driver)}>{driver.active?"Desactivar":"Reactivar"}</button>
          </div>
        </div>;
      })}
    </div>
  </div>;
}
