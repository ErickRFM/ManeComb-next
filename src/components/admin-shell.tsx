"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback,useEffect,useMemo,useRef,useState } from "react";
import { ThemeToggle } from "@/src/components/theme-toggle";
import {Icon,type IconName} from "@/src/components/ui/icon";
import {SignOutButton} from "@/src/components/sign-out-button";
import {BrandLogo} from "@/src/components/brand-logo";
import {useDrawerFocus} from "@/src/hooks/useDrawerFocus";
import {hasPlatformPermission,type PlatformPermission} from "@/src/core/platform/permissions";

const items:Array<{label:string;href:string;key:IconName;permission:PlatformPermission}>=[
  {label:"Empresas",href:"/admin/empresas",key:"users",permission:"platform.organizations.read"},
  {label:"Comercial",href:"/admin/comercial",key:"billing",permission:"platform.billing.read"},
  {label:"Pagos manuales",href:"/admin/pagos-manuales",key:"billing",permission:"platform.billing.read"},
  {label:"Gobernanza",href:"/admin/gobernanza",key:"document",permission:"platform.audit.read"},
  {label:"Personal interno",href:"/admin/personal",key:"users",permission:"platform.users.read"},
  {label:"Sesiones",href:"/admin/sesiones",key:"more",permission:"platform.sessions.read"},
  {label:"Salud del sistema",href:"/admin/salud",key:"summary",permission:"platform.system.read"},
  {label:"Versiones App",href:"/admin/versiones",key:"more",permission:"platform.releases.read"}
];

export function AdminShell({children}:{children:React.ReactNode}){
  const pathname=usePathname();
  const [mobileOpen,setMobileOpen]=useState(false);
  const [sessionUser,setSessionUser]=useState<any>(null);
  const [sessionLoaded,setSessionLoaded]=useState(false);
  const drawer=useRef<HTMLElement|null>(null),closeDrawer=useCallback(()=>setMobileOpen(false),[]);
  useDrawerFocus(mobileOpen,drawer,closeDrawer);

  useEffect(()=>setMobileOpen(false),[pathname]);
  useEffect(()=>{
    let mounted=true;
    fetch("/api/auth/session",{cache:"no-store"})
      .then(async response=>response.ok?response.json():null)
      .then(data=>{if(mounted)setSessionUser(data?.user||null)})
      .catch(()=>undefined)
      .finally(()=>{if(mounted)setSessionLoaded(true)});
    return()=>{mounted=false};
  },[]);

  const visibleItems=useMemo(()=>{
    if(!sessionLoaded)return [];
    if(!sessionUser)return [];
    return items.filter(item=>hasPlatformPermission(sessionUser,item.permission));
  },[sessionLoaded,sessionUser]);

  const current=useMemo(()=>items.find(item=>pathname.startsWith(item.href))?.label||"Administración",[pathname]);

  return <div className="product-shell admin-product-shell">
    <aside className="product-sidebar admin-sidebar" aria-label="Administración global">
      <div className="sidebar-brand-row">
        <Link href="/admin/salud" className="product-brand" aria-label="ManeComb Administración"><BrandLogo size="sm" className="sidebar-logo"/><span className="brand-copy"><small>Control global</small></span></Link>
      </div>
      <div className="admin-scope"><span>PLATAFORMA</span><strong>Administración global</strong></div>
      <nav className="product-nav">
        <div className="nav-group">
          <span className="nav-group-label">Gobierno</span>
          {visibleItems.map(item=>{
            const active=pathname.startsWith(item.href);
            return <Link key={item.href} href={item.href} className={"nav-item "+(active?"active":"")} aria-current={active?"page":undefined}><span className="nav-key"><Icon name={item.key}/></span><span className="nav-label">{item.label}</span></Link>;
          })}
        </div>
      </nav>
      <div className="sidebar-footer">
        <div className="system-pill admin"><span className="live-dot"/>MFA verificado</div>
        <SignOutButton className="nav-item nav-button"/>
      </div>
    </aside>

    {mobileOpen?<button className="mobile-scrim" aria-label="Cerrar menú" onClick={()=>setMobileOpen(false)}/>:null}
    {mobileOpen?<aside ref={drawer} className="mobile-drawer open" role="dialog" aria-modal="true" aria-label="Menú administrativo">
      <div className="mobile-drawer-head"><BrandLogo size="sm"/><strong>Admin Global</strong><button type="button" className="icon-action" onClick={()=>setMobileOpen(false)} aria-label="Cerrar menú">×</button></div>
      {visibleItems.map(item=><Link key={item.href} href={item.href} className={"mobile-drawer-link "+(pathname.startsWith(item.href)?"active":"")} aria-current={pathname.startsWith(item.href)?"page":undefined}><span><Icon name={item.key}/></span>{item.label}</Link>)}
      <SignOutButton className="mobile-drawer-link danger"/>
    </aside>:null}

    <div className="product-workspace" inert={mobileOpen}>
      <header className="workspace-topbar">
        <div className="topbar-left"><button className="mobile-menu-button" onClick={()=>setMobileOpen(true)} aria-label="Abrir menú">☰</button><div><span className="workspace-context">Admin /</span> <strong>{current}</strong></div></div>
        <div className="topbar-actions"><span className="admin-mode-pill">MODO PLATAFORMA</span><ThemeToggle/></div>
      </header>
      <main id="main-content" className="workspace-content" tabIndex={-1}>{children}</main>
    </div>
  </div>;
}
