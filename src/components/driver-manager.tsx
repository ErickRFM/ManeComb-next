"use client";
import { FormEvent, useCallback, useEffect, useState } from "react";

export function DriverManager(){
  const [drivers,setDrivers]=useState<any[]>([]);
  const [vehicles,setVehicles]=useState<any[]>([]);
  const [routes,setRoutes]=useState<any[]>([]);
  const [journeys,setJourneys]=useState<any[]>([]);
  const [state,setState]=useState("Cargando...");
  const [activation,setActivation]=useState("");

  const load=useCallback(async()=>{
    const responses=await Promise.all([fetch("/api/drivers"),fetch("/api/vehicles"),fetch("/api/routes"),fetch("/api/journeys")]);
    const payloads=await Promise.all(responses.map(r=>r.json()));
    responses.forEach((r,i)=>{if(!r.ok)throw new Error(payloads[i].error||"No se pudo cargar el módulo")});
    setDrivers(payloads[0].drivers||[]);
    setVehicles(payloads[1].vehicles||[]);
    setRoutes(payloads[2].routes||[]);
    setJourneys(payloads[3].journeys||[]);
    setState((payloads[0].drivers||[]).length+" conductores");
  },[]);

  useEffect(()=>{void load().catch(error=>setState(error.message))},[load]);

  async function createDriver(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    const form=event.currentTarget;
    const body=Object.fromEntries(new FormData(form).entries());
    const response=await fetch("/api/drivers",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});
    const data=await response.json();
    if(!response.ok)return setState(data.error||"No se pudo crear conductor");
    form.reset();
    await load();
  }

  async function createActivation(driverId:string){
    setActivation("");
    const response=await fetch("/api/activation-keys",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({driverId,ttlHours:72})});
    const data=await response.json();
    if(!response.ok)return setState(data.error||"No se pudo generar llave");
    setActivation(data.code);
    setState("Llave válida hasta "+new Date(data.expiresAt).toLocaleString());
  }

  async function assign(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    const form=event.currentTarget;
    const raw=Object.fromEntries(new FormData(form).entries());
    const body={driverId:raw.driverId,vehicleId:raw.vehicleId,...(raw.routeId?{routeId:raw.routeId}:{})};
    const response=await fetch("/api/journeys",{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify(body)});
    const data=await response.json();
    if(!response.ok)return setState(data.error||"No se pudo asignar jornada");
    form.reset();
    setState("Jornada asignada");
    await load();
  }

  async function toggle(driver:any){
    const response=await fetch("/api/drivers/"+driver._id,{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({active:!driver.active})});
    const data=await response.json();
    if(!response.ok)return setState(data.error||"No se pudo actualizar");
    await load();
  }

  return <div className="grid">
    <span className="muted">{state}</span>
    {activation?<div className="card"><strong>Llave de activación</strong><div className="kpi" style={{overflowWrap:"anywhere"}}>{activation}</div><p className="muted">Muéstrala al conductor una sola vez. No se almacena en texto plano.</p></div>:null}

    <div className="grid grid-3">
      <form className="card grid" onSubmit={createDriver}>
        <strong>Nuevo conductor</strong>
        <input className="input" name="name" placeholder="Nombre" required/>
        <input className="input" name="email" type="email" placeholder="Correo" required/>
        <input className="input" name="pin" type="password" minLength={8} placeholder="PIN / clave temporal (8+)" required/>
        <button className="btn">Crear conductor</button>
      </form>

      <form className="card grid" onSubmit={assign}>
        <strong>Asignar jornada</strong>
        <select className="input" name="driverId" required><option value="">Conductor</option>{drivers.filter(d=>d.active).map(d=><option key={d._id} value={d._id}>{d.name}</option>)}</select>
        <select className="input" name="vehicleId" required><option value="">Unidad</option>{vehicles.filter(v=>v.status!=="archived").map(v=><option key={v._id} value={v._id}>{v.economicNumber}</option>)}</select>
        <select className="input" name="routeId"><option value="">Sin ruta</option>{routes.filter(r=>r.status==="active").map(r=><option key={r._id} value={r._id}>{r.name}</option>)}</select>
        <button className="btn">Asignar</button>
      </form>

      <div className="card">
        <strong>Jornadas activas</strong>
        <p className="kpi">{journeys.filter(j=>!["FINISHED","CANCELLED"].includes(j.state)).length}</p>
        <p className="muted">ASSIGNED → READY → RUNNING ↔ PAUSED → FINISHED/CANCELLED</p>
      </div>
    </div>

    <div className="grid grid-3">{drivers.map(driver=><div className="card grid" key={driver._id}>
      <div className="status-row"><strong>{driver.name}</strong><span className="badge">{driver.active?"activo":"inactivo"}</span></div>
      <span className="muted">{driver.email}</span>
      <button className="btn" onClick={()=>void createActivation(driver._id)} disabled={!driver.active}>Generar llave</button>
      <button className="btn secondary" onClick={()=>void toggle(driver)}>{driver.active?"Desactivar":"Reactivar"}</button>
    </div>)}</div>
  </div>
}
