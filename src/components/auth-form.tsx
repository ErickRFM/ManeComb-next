"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function AuthForm({mode}:{mode:"login"|"register"}) {
  const router=useRouter();
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);

  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    setBusy(true);
    setError("");
    const body=Object.fromEntries(new FormData(event.currentTarget).entries());
    const response=await fetch("/api/auth/"+mode,{
      method:"POST",
      headers:{"content-type":"application/json"},
      body:JSON.stringify(body)
    });
    const result=await response.json().catch(()=>({}));
    setBusy(false);
    if(!response.ok)return setError(result.error||"No fue posible completar la operación");

    if(result.mfaRequired){
      router.push("/mfa");
      router.refresh();
      return;
    }

    const channel=result.user?.channel;
    router.push(channel==="mobile_operations"?"/operacion":channel==="platform_admin"?"/admin/salud":"/portal/dashboard");
    router.refresh();
  }

  return <form onSubmit={submit} className="card grid" style={{maxWidth:520}}>
    {mode==="register"?<>
      <input className="input" name="organizationName" placeholder="Empresa / línea" required/>
      <input className="input" name="name" placeholder="Nombre del responsable" required/>
    </>:null}
    <input className="input" name="email" type="email" placeholder="Correo" required/>
    <input className="input" name="password" type="password" placeholder="Contraseña" minLength={mode==="register"?10:8} required/>
    {error?<p style={{color:"#fb7185",margin:0}}>{error}</p>:null}
    <button className="btn" disabled={busy}>{busy?"Procesando...":mode==="login"?"Entrar":"Crear empresa"}</button>
  </form>;
}
