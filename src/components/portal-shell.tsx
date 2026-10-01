"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ThemeToggle } from "@/src/components/theme-toggle";
import { useNetworkStatus } from "@/src/hooks/useNetworkStatus";
import {AppRoleSchema,type AppRole} from "@/src/core/contracts/auth";
import {hasPermission,type Permission} from "@/src/core/domain/permissions";
import {Icon,type IconName} from "@/src/components/ui/icon";
import {SignOutButton} from "@/src/components/sign-out-button";
import {BrandLogo} from "@/src/components/brand-logo";
import {PortalAccessContext} from "@/src/hooks/usePortalPermission";

import {useDrawerFocus} from "@/src/hooks/useDrawerFocus";

const groups=[
  {label:"Operación",items:[
    {label:"Mapa",href:"/portal/monitoreo",key:"map",permission:"view_analytics"},
    {label:"Resumen",href:"/portal/dashboard",key:"summary",permission:"view_analytics"}
  ]},
  {label:"Gestión",items:[
    {label:"Unidades",href:"/portal/unidades",key:"vehicle",permission:"view_analytics"},
    {label:"Rutas",href:"/portal/rutas",key:"route",permission:"view_analytics"},
    {label:"Conductores",href:"/portal/conductores",key:"users",permission:"manage_users"},
    {label:"Documentos",href:"/portal/documentos",key:"document",permission:"manage_documents"}
  ]},
  {label:"Comunicación",items:[
    {label:"Chat",href:"/portal/chat",key:"chat",permission:"access_chat"},
    {label:"Radio / RTC",href:"/portal/radio",key:"radio",permission:"access_radio"},
    {label:"Incidencias",href:"/portal/incidencias",key:"alert",permission:"manage_incidents"}
  ]},
  {label:"Administración",items:[
    {label:"Facturación",href:"/portal/facturacion",key:"billing",permission:"manage_billing"}
  ]}
];

type Profile={name:string;roles:AppRole[]};
export function PortalShell({children,initialProfile}:{children:React.ReactNode;initialProfile?:Profile}){
  const pathname=usePathname();
  const online=useNetworkStatus();
  const [collapsed,setCollapsed]=useState(false);
  const [mobileOpen,setMobileOpen]=useState(false);
  const drawer=useRef<HTMLElement|null>(null);
  const [profile,setProfile]=useState<Profile|null>(initialProfile||null);
  const [profileError,setProfileError]=useState("");
  const [retry,setRetry]=useState(0);

  useEffect(()=>{
    if(initialProfile)return;
    let active=true;
    void fetch("/api/auth/session",{cache:"no-store"}).then(async response=>{
      const data=await response.json();if(!response.ok)throw new Error();
      const roles=AppRoleSchema.array().parse(data.user?.roles);
      if(active){setProfile({name:data.user.name,roles});setProfileError("")}
    }).catch(()=>active&&setProfileError("No se pudo consultar tu acceso. Vuelve a intentar."));
    return()=>{active=false};
  },[initialProfile,retry]);
  const visibleGroups=groups.map(group=>({...group,items:group.items.filter(item=>profile&&hasPermission(profile.roles,item.permission as Permission))})).filter(group=>group.items.length);

  const closeDrawer=useCallback(()=>setMobileOpen(false),[]);
  useDrawerFocus(mobileOpen,drawer,closeDrawer);

  useEffect(()=>{
    setCollapsed(localStorage.getItem("manecomb.portal.sidebar")==="collapsed");
  },[]);

  useEffect(()=>setMobileOpen(false),[pathname]);

  const current=useMemo(()=>{
    for(const group of groups){
      const item=group.items.find(item=>pathname===item.href||pathname.startsWith(item.href+"/"));
      if(item)return item.label;
    }
    return "Portal";
  },[pathname]);

  function toggleSidebar(){
    setCollapsed(value=>{
      const next=!value;
      localStorage.setItem("manecomb.portal.sidebar",next?"collapsed":"expanded");
      return next;
    });
  }

  return <div className={"product-shell "+(collapsed?"is-collapsed":"")}>
    <aside className="product-sidebar" aria-label="Navegación del portal" inert={mobileOpen}>
      <div className="sidebar-brand-row">
        <Link href="/portal/monitoreo" className="product-brand" aria-label="ManeComb Portal">
          <span className="brand-mark">MC</span>
          <span className="brand-copy"><strong>ManeComb</strong><small>Portal operativo</small></span>
        </Link>
        <button className="sidebar-collapse" onClick={toggleSidebar} aria-label={collapsed?"Expandir menú":"Contraer menú"}>{collapsed?"›":"‹"}</button>
      </div>

      <nav className="product-nav">
        {visibleGroups.map(group=><div className="nav-group" key={group.label}>
          <span className="nav-group-label">{group.label}</span>
          {group.items.map(item=>{
            const active=pathname===item.href||pathname.startsWith(item.href+"/");
            return <Link key={item.href} href={item.href} className={"nav-item "+(active?"active":"")} aria-current={active?"page":undefined}>
              <span className="nav-key"><Icon name={item.key as IconName}/></span>
              <span className="nav-label">{item.label}</span>
            </Link>;
          })}
        </div>)}
      </nav>

      <div className="sidebar-footer">
        <div className="system-pill" aria-live="polite"><span className="live-dot" style={online===false?{background:"var(--danger)"}:undefined}/>{online===null?"Consultando red":online?"Red disponible":"Sin red"}</div>
        {profile?<p className="muted">{profile.name} · {profile.roles.join(", ")}</p>:<p role="status">Consultando acceso…</p>}
        <SignOutButton className="nav-item nav-button"/>
      </div>
    </aside>

    {mobileOpen?<button className="mobile-scrim" aria-label="Cerrar menú" onClick={()=>setMobileOpen(false)}/>:null}
    {mobileOpen?<aside ref={drawer} className="mobile-drawer open" role="dialog" aria-modal="true" aria-label="Menú móvil">
      <div className="mobile-drawer-head"><BrandLogo size="sm"/><button type="button" className="icon-action" onClick={()=>setMobileOpen(false)} aria-label="Cerrar menú">×</button></div>
      {visibleGroups.flatMap(group=>group.items).map(item=><Link key={item.href} href={item.href} className={"mobile-drawer-link "+(pathname.startsWith(item.href)?"active":"")} aria-current={pathname===item.href?"page":undefined}><span><Icon name={item.key as IconName}/></span>{item.label}</Link>)}
      {profile?<p>{profile.name}</p>:null}
      <SignOutButton className="mobile-drawer-link danger"/>
    </aside>:null}

    <div className="product-workspace" inert={mobileOpen}>
      <header className="workspace-topbar">
        <div className="topbar-left">
          <button className="mobile-menu-button" onClick={()=>setMobileOpen(true)} aria-label="Abrir menú" aria-expanded={mobileOpen}><Icon name="menu"/></button>
          <div><span className="workspace-context">Portal /</span> <strong>{current}</strong></div>
        </div>
        <div className="topbar-actions">
          {profile&&hasPermission(profile.roles,"view_analytics")?<Link href="/portal/monitoreo" className="topbar-live"><Icon name="map"/>Mapa de flota</Link>:null}
          <ThemeToggle/>
        </div>
      </header>
      <main id="main-content" className="workspace-content" tabIndex={-1}>{profileError?<p role="alert">{profileError} <button className="btn secondary" onClick={()=>setRetry(value=>value+1)}>Reintentar acceso</button></p>:null}<PortalAccessContext.Provider value={profile?.roles||null}>{children}</PortalAccessContext.Provider></main>
    </div>
  </div>;
}
