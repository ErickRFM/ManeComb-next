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
    setStatus((data.vehicles||[]).filter((v:Vehicle)=>v.status!=="archived").length+" unidades activas");
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

  async function update(vehicleId:string,patch:Record<string,unknown>){
    const response=await fetch("/api/vehicles/"+vehicleId,{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify(patch)});
    const data=await response.json();
    if(!response.ok)return setStatus(data.error||"No se pudo actualizar");
    await load();
  }

  async function edit(vehicle:Vehicle){
    const economicNumber=window.prompt("Número económico",vehicle.economicNumber)?.trim();
    if(!economicNumber)return;
    const plates=window.prompt("Placas",vehicle.plates||"")??vehicle.plates??"";
    const model=window.prompt("Modelo",vehicle.model||"")??vehicle.model??"";
    const capacityRaw=window.prompt("Capacidad",String(vehicle.capacity||""));
    const capacity=capacityRaw?Number(capacityRaw):undefined;
    await update(vehicle._id,{economicNumber,plates,model,...(Number.isFinite(capacity)?{capacity}:{})});
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

    <div className="grid grid-3">{vehicles.map((vehicle)=><div className="card grid" key={vehicle._id}>
      <div className="status-row"><h3 style={{margin:0}}>{vehicle.economicNumber}</h3><span className="badge">{vehicle.status}</span></div>
      <p className="muted">{vehicle.plates||"Sin placas"} · {vehicle.model||"Sin modelo"} · {vehicle.capacity||"—"} pasajeros</p>
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        <button className="btn secondary" onClick={()=>void edit(vehicle)}>Editar</button>
        {vehicle.status==="maintenance"?<button className="btn" onClick={()=>void update(vehicle._id,{status:"active"})}>Reactivar</button>:vehicle.status!=="archived"&&vehicle.status!=="running"?<button className="btn secondary" onClick={()=>void update(vehicle._id,{status:"maintenance"})}>Mantenimiento</button>:null}
        {vehicle.status!=="archived"&&vehicle.status!=="running"?<button className="btn secondary" onClick={()=>window.confirm("¿Archivar unidad?")&&void update(vehicle._id,{status:"archived"})}>Archivar</button>:null}
      </div>
    </div>)}</div>
  </div>
}
