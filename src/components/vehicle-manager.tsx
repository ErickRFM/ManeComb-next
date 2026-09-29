"use client";
import { FormEvent, useCallback, useEffect, useState } from "react";

type Vehicle={_id:string;economicNumber:string;plates?:string;model?:string;capacity?:number;status:string};

export function VehicleManager(){
  const [vehicles,setVehicles]=useState<Vehicle[]>([]);
  const [status,setStatus]=useState("Cargando...");
  const [busy,setBusy]=useState(false);

  const load=useCallback(async()=>{
    const response=await fetch("/api/vehicles");
    const data=await response.json();
    if(!response.ok) throw new Error(data.error||"No se pudo cargar la flota");
    setVehicles(data.vehicles||[]);
    setStatus((data.vehicles||[]).length+" unidades");
  },[]);

  useEffect(()=>{void load().catch((error)=>setStatus(error.message))},[load]);

  async function create(event:FormEvent<HTMLFormElement>){
    event.preventDefault();setBusy(true);
    const form=event.currentTarget;
    const raw=Object.fromEntries(new FormData(form).entries());
    const body={...raw,capacity:raw.capacity?Number(raw.capacity):undefined};
    const response=await fetch("/api/vehicles",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});
    const data=await response.json();
    setBusy(false);
    if(!response.ok) return setStatus(data.error||"No se pudo crear");
    form.reset();
    await load();
  }

  return <div className="grid">
    <form className="card grid" onSubmit={create}>
      <div className="status-row"><strong>Nueva unidad</strong><span className="muted">{status}</span></div>
      <div className="grid grid-3">
        <input className="input" name="economicNumber" placeholder="Número económico" required/>
        <input className="input" name="plates" placeholder="Placas"/>
        <input className="input" name="model" placeholder="Modelo"/>
      </div>
      <input className="input" name="capacity" type="number" min="1" max="100" placeholder="Capacidad"/>
      <button className="btn" disabled={busy}>{busy?"Guardando...":"Agregar unidad"}</button>
    </form>
    <div className="grid grid-3">{vehicles.map((vehicle)=><div className="card" key={vehicle._id}><h3 style={{marginTop:0}}>{vehicle.economicNumber}</h3><p className="muted">{vehicle.plates||"Sin placas"} · {vehicle.model||"Sin modelo"}</p><span className="badge">{vehicle.status}</span></div>)}</div>
  </div>
}
