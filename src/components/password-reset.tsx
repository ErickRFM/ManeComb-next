"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
export function PasswordReset({token}:{token:string}){
  const router=useRouter();
  const [state,setState]=useState("");
  const [busy,setBusy]=useState(false);
  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();setBusy(true);setState("");
    const password=String(new FormData(event.currentTarget).get("password")||"");
    const response=await fetch("/api/auth/reset-password",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({token,password})});
    const data=await response.json().catch(()=>({}));
    setBusy(false);
    if(!response.ok)return setState(data.error||"No se pudo cambiar la contraseña");
    setState("Contraseña actualizada. Redirigiendo...");
    setTimeout(()=>router.push("/login"),700);
  }
  return <form className="card grid" style={{maxWidth:520}} onSubmit={submit}>
    <input className="input" name="password" type="password" minLength={10} placeholder="Nueva contraseña (10+)" required/>
    <button className="btn" disabled={busy}>{busy?"Guardando...":"Cambiar contraseña"}</button>
    {state?<p className="muted" style={{margin:0}}>{state}</p>:null}
  </form>
}
