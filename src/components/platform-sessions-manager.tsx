"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { hasPlatformPermission, type PlatformRole } from "@/src/core/platform/permissions";

type SessionUser={id:string;roles:string[];platformRoles:PlatformRole[];channel:string};
type PlatformSession={
  _id:string;
  user:{_id:string;name:string;email:string;platformRoles:PlatformRole[];active:boolean}|null;
  createdAt:string;
  expiresAt:string;
  revokedAt:string|null;
  current:boolean;
};

export function PlatformSessionsManager(){
  const [session,setSession]=useState<SessionUser|null>(null);
  const [items,setItems]=useState<PlatformSession[]>([]);
  const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState("");

  const load=useCallback(async()=>{
    setLoading(true);setError("");
    try{
      const [sessionResponse,listResponse]=await Promise.all([
        fetch("/api/auth/session",{cache:"no-store"}),
        fetch("/api/admin/sessions",{cache:"no-store"})
      ]);
      const [sessionData,listData]=await Promise.all([sessionResponse.json(),listResponse.json()]);
      if(!sessionResponse.ok)throw new Error(sessionData.error||"SESSION_ERROR");
      if(!listResponse.ok)throw new Error(listData.error||"SESSIONS_ERROR");
      setSession(sessionData.user);
      setItems(listData.sessions||[]);
    }catch{setError("No se pudieron cargar las sesiones administrativas.");}
    finally{setLoading(false)}
  },[]);

  useEffect(()=>{void load()},[load]);

  const canRevoke=useMemo(()=>session?hasPlatformPermission(session as any,"platform.sessions.revoke"):false,[session]);

  async function revoke(sessionId:string){
    if(busy)return;setBusy(true);setError("");
    try{
      const response=await fetch("/api/admin/sessions/"+sessionId,{method:"DELETE"});
      const data=await response.json();
      if(!response.ok)throw new Error(data.error||"REVOKE_ERROR");
      await load();
    }catch(error){setError(error instanceof Error?error.message:"No se pudo revocar la sesión.");}
    finally{setBusy(false)}
  }

  async function revokeAll(userId:string){
    if(busy)return;setBusy(true);setError("");
    try{
      const response=await fetch("/api/admin/users/"+userId+"/sessions/revoke-all",{method:"POST"});
      const data=await response.json();
      if(!response.ok)throw new Error(data.error||"REVOKE_ALL_ERROR");
      await load();
    }catch(error){setError(error instanceof Error?error.message:"No se pudieron revocar las sesiones.");}
    finally{setBusy(false)}
  }

  const active=items.filter(item=>!item.revokedAt&&new Date(item.expiresAt).getTime()>Date.now());

  return <div className="grid">
    <div className="entity-toolbar">
      <span className="entity-state" role="status">{loading?"Cargando sesiones…":active.length+" sesiones activas"}</span>
      <button className="btn secondary" disabled={loading||busy} onClick={()=>void load()}>Actualizar</button>
    </div>
    {error?<p role="alert">{error}</p>:null}
    <div className="admin-payment-list">
      {items.map(item=><article className="admin-payment-row" key={item._id}>
        <span className={"payment-icon "+(item.revokedAt?"pending":"approved")}>{item.current?"●":"S"}</span>
        <div className="payment-copy">
          <strong>{item.user?.name||"Usuario interno"}{item.current?" · sesión actual":""}</strong>
          <small>{item.user?.email||"Sin usuario"} · creada {new Date(item.createdAt).toLocaleString()}</small>
        </div>
        <div className="payment-amount">
          <strong>{item.revokedAt?"Revocada":"Activa"}</strong>
          <small>Expira {new Date(item.expiresAt).toLocaleString()}</small>
        </div>
        {canRevoke&&!item.revokedAt?<div className="entity-actions">
          <button className="danger" disabled={busy||item.current} onClick={()=>void revoke(item._id)}>Revocar</button>
          {item.user?<button disabled={busy||item.current} onClick={()=>void revokeAll(item.user!._id)}>Cerrar todas</button>:null}
        </div>:null}
      </article>)}
      {!items.length&&!loading?<div className="empty-state"><strong>Sin sesiones</strong><span>No hay sesiones administrativas vigentes.</span></div>:null}
    </div>
  </div>;
}
