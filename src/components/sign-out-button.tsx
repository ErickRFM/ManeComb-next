"use client";
import {useState} from "react";
import {useRouter} from "next/navigation";
import {Icon} from "@/src/components/ui/icon";
import {isNativeLocationAvailable,stopNativeLocation} from "@/src/lib/native-location";
export function SignOutButton({operation=false,className="btn secondary"}:{operation?:boolean;className?:string}){
  const router=useRouter();const [busy,setBusy]=useState(false);const [error,setError]=useState("");
  async function signOut(){
    if(busy)return;setBusy(true);setError("");
    try{
      if(operation&&isNativeLocationAvailable())await stopNativeLocation();
      const response=await fetch("/api/auth/logout",{method:"POST"});
      if(!response.ok)throw new Error();
      router.replace(operation?"/login?surface=operation":"/login");router.refresh();
    }catch{setError("No se pudo cerrar la sesión. Vuelve a intentar.")}
    finally{setBusy(false)}
  }
  return <div><button type="button" className={className} disabled={busy} onClick={()=>void signOut()}><Icon name="logout"/><span>{busy?"Cerrando…":"Cerrar sesión"}</span></button>{error?<p role="alert">{error}</p>:null}</div>;
}
