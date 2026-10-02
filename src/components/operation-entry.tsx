"use client";
import {useEffect,useState} from "react";
import {useRouter} from "next/navigation";
import {channelHome} from "@/src/lib/channel-home";
import {OperationSessionLoading} from "@/src/components/operation-session-loading";

export function OperationEntry(){
  const router=useRouter();const [retry,setRetry]=useState(0);const [error,setError]=useState("");
  useEffect(()=>{
    const controller=new AbortController();setError("");
    const timer=setTimeout(()=>controller.abort(),10000);let mounted=true;
    void fetch("/api/auth/session",{signal:controller.signal,cache:"no-store"}).then(async response=>{
      if(!mounted)return;
      if(response.status===401){router.replace("/login?surface=operation");return}
      const data=await response.json();
      if(!response.ok)throw new Error("No se pudo comprobar la sesión");
      router.replace(channelHome(data.user?.channel));
    }).catch(()=>{if(mounted)setError("No se pudo comprobar tu sesión. Revisa tu conexión y vuelve a intentar.")})
      .finally(()=>clearTimeout(timer));
    return()=>{mounted=false;clearTimeout(timer);controller.abort()};
  },[router,retry]);
  return <OperationSessionLoading error={error} onRetry={()=>setRetry(value=>value+1)}/>;
}
