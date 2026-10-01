"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { channelHome } from "@/src/lib/channel-home";

export function AuthForm({mode,planCode,operation=false}:{mode:"login"|"register";planCode?:string;operation?:boolean}) {
  const router=useRouter();
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);

  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    setBusy(true);
    setError("");
    const body=Object.fromEntries(new FormData(event.currentTarget).entries());
    try{
    const response=await fetch("/api/auth/"+mode,{
      method:"POST",
      headers:{"content-type":"application/json"},
      body:JSON.stringify(body)
    });
    const result=await response.json().catch(()=>({}));
    if(!response.ok)return setError(result.error||"No fue posible completar la operación");

    if(result.mfaRequired){
      router.push(operation?"/mfa?surface=operation":"/mfa");
      router.refresh();
      return;
    }

    router.push(planCode&&result.user?.channel==="company_portal"?"/checkout/"+encodeURIComponent(planCode):channelHome(result.user?.channel));
    router.refresh();
    }catch{setError("No se pudo completar el acceso. Comprueba tu conexión e inténtalo de nuevo.")}
    finally{setBusy(false)}
  }

  return <form onSubmit={submit} className={"card grid"+(operation?" operation-auth-form":"")} style={{maxWidth:520}}>
    {mode==="register"?<>
      <label>Empresa / línea<input className="input" name="organizationName" autoComplete="organization" required/></label>
      <label>Nombre del responsable<input className="input" name="name" autoComplete="name" required/></label>
    </>:null}
    <label>Correo<input className="input" name="email" type="email" autoComplete="username" required/></label>
    <label>Contraseña<input className="input" name="password" type="password" autoComplete={mode==="register"?"new-password":"current-password"} minLength={mode==="register"?10:8} required/></label>
    {error?<p role="alert" style={{color:"var(--danger)",margin:0}}>{error}</p>:null}
    <button className="btn" disabled={busy}>{busy?"Procesando...":mode==="login"?(operation?"Iniciar sesión":"Entrar"):"Crear empresa"}</button>
  </form>;
}
