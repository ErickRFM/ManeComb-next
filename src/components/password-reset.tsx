"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { PasswordField } from "@/src/components/password-field";
import { authErrorMessage } from "@/src/lib/auth-errors";

export function PasswordReset({token}:{token:string}){
  const router=useRouter();
  const [state,setState]=useState("");
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState(false);

  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();setBusy(true);setState("");setError(false);
    const data=new FormData(event.currentTarget);
    const password=String(data.get("password")||"");
    const confirmation=String(data.get("confirmation")||"");
    if(password!==confirmation){
      setError(true);setState("Las contraseñas no coinciden.");setBusy(false);return;
    }
    try{
      const response=await fetch("/api/auth/reset-password",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({token,password})});
      const result=await response.json().catch(()=>({}));
      if(!response.ok){setError(true);return setState(authErrorMessage(result,"No se pudo cambiar la contraseña"))}
      setState("Contraseña actualizada. Redirigiendo...");
      router.replace("/login");
    }catch{
      setError(true);setState("No se pudo cambiar la contraseña. Revisa la conexión y vuelve a intentar.");
    }finally{
      setBusy(false);
    }
  }

  return <form className="card grid" aria-busy={busy} style={{maxWidth:520}} onSubmit={submit}>
    <PasswordField label="Nueva contraseña" name="password" minLength={10} maxLength={128} autoComplete="new-password" placeholder="Nueva contraseña (10+)" required/>
    <PasswordField label="Confirmar contraseña" name="confirmation" minLength={10} maxLength={128} autoComplete="new-password" placeholder="Repite la contraseña" required/>
    <button className="btn" disabled={busy}>{busy?"Guardando...":"Cambiar contraseña"}</button>
    {state?<p className={error?"danger-text":"muted"} role={error?"alert":"status"} style={{margin:0}}>{state}</p>:null}
  </form>
}
