"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
export function ActivationForm(){
  const router=useRouter(); const [error,setError]=useState(""); const [busy,setBusy]=useState(false);
  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault(); setBusy(true); setError("");
    const code=String(new FormData(event.currentTarget).get("code")||"");
    try{const response=await fetch("/api/auth/activate",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({code})});
    const data=await response.json().catch(()=>({}));
    if(!response.ok) return setError(data.error||"No se pudo activar");
    if(data.vehicleId) localStorage.setItem("manecomb.vehicleId",data.vehicleId);
    router.push("/operacion"); router.refresh();
    }catch{setError("No se pudo activar el dispositivo. Revisa la conexión y vuelve a intentar.")}
    finally{setBusy(false)}
  }
  return <form className="card grid" aria-busy={busy} style={{maxWidth:520}} onSubmit={submit}><label className="grid">Llave de activación<input className="input" name="code" autoComplete="off" placeholder="Llave de activación" required/></label>{error?<p className="danger-text" role="alert" style={{margin:0}}>{error}</p>:null}<button className="btn" disabled={busy}>{busy?"Validando...":"Activar dispositivo"}</button></form>
}
