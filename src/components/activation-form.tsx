"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
export function ActivationForm(){
  const router=useRouter(); const [error,setError]=useState(""); const [busy,setBusy]=useState(false);
  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault(); setBusy(true); setError("");
    const code=String(new FormData(event.currentTarget).get("code")||"");
    const response=await fetch("/api/auth/activate",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({code})});
    const data=await response.json().catch(()=>({})); setBusy(false);
    if(!response.ok) return setError(data.error||"No se pudo activar");
    if(data.vehicleId) localStorage.setItem("manecomb.vehicleId",data.vehicleId);
    router.push("/operacion"); router.refresh();
  }
  return <form className="card grid" style={{maxWidth:520}} onSubmit={submit}><input className="input" name="code" placeholder="Llave de activación" required/>{error?<p style={{color:"#fb7185",margin:0}}>{error}</p>:null}<button className="btn" disabled={busy}>{busy?"Validando...":"Activar dispositivo"}</button></form>
}
