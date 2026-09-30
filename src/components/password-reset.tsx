"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
export function PasswordReset({token}:{token:string}){
  const router=useRouter();
  const [state,setState]=useState("");
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState(false);
  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();setBusy(true);setState("");setError(false);
    const password=String(new FormData(event.currentTarget).get("password")||"");
    try{const response=await fetch("/api/auth/reset-password",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({token,password})});
    const data=await response.json().catch(()=>({}));
    if(!response.ok){setError(true);return setState(data.error||"No se pudo cambiar la contraseña")}
    setState("Contraseña actualizada. Redirigiendo...");
    router.replace("/login");
    }catch{setError(true);setState("No se pudo cambiar la contraseña. Revisa la conexión y vuelve a intentar.")}
    finally{setBusy(false)}
  }
  return <form className="card grid" style={{maxWidth:520}} onSubmit={submit}>
    <label className="grid">Nueva contraseña<input className="input" name="password" type="password" minLength={10} autoComplete="new-password" placeholder="Nueva contraseña (10+)" required/></label>
    <button className="btn" disabled={busy}>{busy?"Guardando...":"Cambiar contraseña"}</button>
    {state?<p className={error?"danger-text":"muted"} role={error?"alert":"status"} style={{margin:0}}>{state}</p>:null}
  </form>
}
