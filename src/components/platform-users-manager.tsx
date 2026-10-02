"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { hasPlatformPermission, type PlatformRole } from "@/src/core/platform/permissions";
import { UiModal } from "@/src/components/ui-modal";

type PlatformUser={
  _id:string;
  name:string;
  email:string;
  platformRoles:PlatformRole[];
  active:boolean;
  mfaEnabled:boolean;
  createdAt?:string;
};
type SessionUser={id:string;roles:string[];platformRoles:PlatformRole[];channel:string};

const ROLES:PlatformRole[]=[
  "platform_owner","platform_admin","platform_support","platform_finance","platform_viewer"
];
const labels:Record<PlatformRole,string>={
  platform_owner:"Propietario",
  platform_admin:"Administrador",
  platform_support:"Soporte",
  platform_finance:"Finanzas",
  platform_viewer:"Consulta"
};

export function PlatformUsersManager(){
  const [users,setUsers]=useState<PlatformUser[]>([]);
  const [session,setSession]=useState<SessionUser|null>(null);
  const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState("");
  const [search,setSearch]=useState("");
  const [showCreate,setShowCreate]=useState(false);

  const load=useCallback(async()=>{
    setLoading(true);setError("");
    try{
      const [sessionResponse,usersResponse]=await Promise.all([
        fetch("/api/auth/session",{cache:"no-store"}),
        fetch("/api/admin/users?limit=100",{cache:"no-store"})
      ]);
      const [sessionData,usersData]=await Promise.all([sessionResponse.json(),usersResponse.json()]);
      if(!sessionResponse.ok)throw new Error(sessionData.error||"SESSION_ERROR");
      if(!usersResponse.ok)throw new Error(usersData.error||"USERS_ERROR");
      setSession(sessionData.user);
      setUsers(usersData.users||[]);
    }catch{setError("No se pudo cargar el personal interno. Revisa tu acceso o conexión.")}
    finally{setLoading(false)}
  },[]);

  useEffect(()=>{void load()},[load]);

  const canManage=useMemo(()=>session?hasPlatformPermission(session as any,"platform.users.manage"):false,[session]);
  const visible=useMemo(()=>{
    const q=search.trim().toLowerCase();
    return users.filter(user=>!q||[user.name,user.email,...user.platformRoles].join(" ").toLowerCase().includes(q));
  },[users,search]);

  async function patchUser(userId:string,patch:{active?:boolean;role?:PlatformRole}){
    if(busy)return;setBusy(true);setError("");
    try{
      const response=await fetch("/api/admin/users/"+userId,{
        method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify(patch)
      });
      const data=await response.json();
      if(!response.ok)throw new Error(data.error||"UPDATE_ERROR");
      await load();
    }catch(error){setError(error instanceof Error?error.message:"No se pudo actualizar el usuario.");}
    finally{setBusy(false)}
  }

  async function createUser(event:FormEvent<HTMLFormElement>){
    event.preventDefault();if(busy)return;setBusy(true);setError("");
    const form=event.currentTarget;
    const raw=Object.fromEntries(new FormData(form).entries());
    try{
      const response=await fetch("/api/admin/users",{
        method:"POST",headers:{"content-type":"application/json"},
        body:JSON.stringify({name:raw.name,email:raw.email,password:raw.password,role:raw.role})
      });
      const data=await response.json();
      if(!response.ok)throw new Error(data.error||"CREATE_ERROR");
      form.reset();setShowCreate(false);await load();
    }catch(error){setError(error instanceof Error?error.message:"No se pudo crear el usuario.");}
    finally{setBusy(false)}
  }

  return <div className="grid">
    <div className="entity-toolbar">
      <div className="entity-search"><input aria-label="Buscar personal interno" value={search} onChange={event=>setSearch(event.target.value)} placeholder="Nombre, correo o rol..."/></div>
      <span className="entity-state">{loading?"Cargando…":users.length+" usuarios internos"}</span>
      {canManage?<button className="btn" onClick={()=>setShowCreate(true)}>Nuevo usuario</button>:null}
    </div>
    {error?<p role="alert">{error}</p>:null}
    <div className="admin-payment-list">
      {visible.map(user=>{
        const role=user.platformRoles[0]||"platform_viewer";
        const current=user._id===session?.id;
        return <article className="admin-payment-row" key={user._id}>
          <span className={"payment-icon "+(user.active?"approved":"pending")}>{user.name.slice(0,1).toUpperCase()}</span>
          <div className="payment-copy">
            <strong>{user.name}{current?" · tú":""}</strong>
            <small>{user.email} · MFA {user.mfaEnabled?"configurado":"pendiente"}</small>
          </div>
          <div className="payment-amount"><strong>{labels[role]}</strong><small>{user.active?"Activo":"Suspendido"}</small></div>
          {canManage?<div className="entity-actions">
            <select className="compact-select" aria-label={"Rol de "+user.name} value={role} disabled={busy||current} onChange={event=>void patchUser(user._id,{role:event.target.value as PlatformRole})}>
              {ROLES.map(item=><option value={item} key={item}>{labels[item]}</option>)}
            </select>
            <button disabled={busy||current} className={user.active?"danger":""} onClick={()=>void patchUser(user._id,{active:!user.active})}>{user.active?"Suspender":"Reactivar"}</button>
          </div>:null}
        </article>
      })}
      {!visible.length&&!loading?<div className="empty-state"><strong>Sin resultados</strong><span>No hay personal que coincida con la búsqueda.</span></div>:null}
    </div>

    <UiModal open={showCreate} onClose={()=>!busy&&setShowCreate(false)} title="Nuevo usuario interno" description="La cuenta deberá configurar MFA al iniciar sesión por primera vez.">
      <form className="grid" onSubmit={createUser}>
        <label>Nombre<input className="input" name="name" minLength={2} required/></label>
        <label>Correo<input className="input" name="email" type="email" autoComplete="email" required/></label>
        <label>Contraseña temporal<input className="input" name="password" type="password" minLength={12} autoComplete="new-password" required/></label>
        <label>Rol<select className="input" name="role" defaultValue="platform_viewer">{ROLES.map(item=><option value={item} key={item}>{labels[item]}</option>)}</select></label>
        <div className="form-actions"><button type="button" className="btn secondary" disabled={busy} onClick={()=>setShowCreate(false)}>Cancelar</button><button className="btn" disabled={busy}>{busy?"Creando…":"Crear usuario"}</button></div>
      </form>
    </UiModal>
  </div>;
}
