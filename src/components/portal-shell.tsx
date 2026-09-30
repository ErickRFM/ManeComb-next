"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ThemeToggle } from "@/src/components/theme-toggle";

const groups=[
  {label:"Operación",items:[
    {label:"Resumen",href:"/portal/dashboard",key:"IN"},
    {label:"Monitoreo",href:"/portal/monitoreo",key:"GPS"}
  ]},
  {label:"Gestión",items:[
    {label:"Unidades",href:"/portal/unidades",key:"FL"},
    {label:"Rutas",href:"/portal/rutas",key:"RT"},
    {label:"Conductores",href:"/portal/conductores",key:"CH"},
    {label:"Documentos",href:"/portal/documentos",key:"DC"}
  ]},
  {label:"Comunicación",items:[
    {label:"Incidencias",href:"/portal/incidencias",key:"AL"},
    {label:"Radio / RTC",href:"/portal/radio",key:"PTT"}
  ]},
  {label:"Cuenta",items:[
    {label:"Facturación",href:"/portal/facturacion",key:"$"}
  ]}
];

export function PortalShell({children}:{children:React.ReactNode}){
  const pathname=usePathname();
  const router=useRouter();
  const [collapsed,setCollapsed]=useState(false);
  const [mobileOpen,setMobileOpen]=useState(false);

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

  async function signOut(){
    await fetch("/api/auth/logout",{method:"POST"}).catch(()=>undefined);
    router.replace("/login");
    router.refresh();
  }

  return <div className={"product-shell "+(collapsed?"is-collapsed":"")}>
    <aside className="product-sidebar" aria-label="Navegación del portal">
      <div className="sidebar-brand-row">
        <Link href="/portal/dashboard" className="product-brand" aria-label="ManeComb Portal">
          <span className="brand-mark">MC</span>
          <span className="brand-copy"><strong>ManeComb</strong><small>Portal operativo</small></span>
        </Link>
        <button className="sidebar-collapse" onClick={toggleSidebar} aria-label={collapsed?"Expandir menú":"Contraer menú"}>{collapsed?"›":"‹"}</button>
      </div>

      <nav className="product-nav">
        {groups.map(group=><div className="nav-group" key={group.label}>
          <span className="nav-group-label">{group.label}</span>
          {group.items.map(item=>{
            const active=pathname===item.href||pathname.startsWith(item.href+"/");
            return <Link key={item.href} href={item.href} className={"nav-item "+(active?"active":"")} aria-current={active?"page":undefined}>
              <span className="nav-key">{item.key}</span>
              <span className="nav-label">{item.label}</span>
            </Link>;
          })}
        </div>)}
      </nav>

      <div className="sidebar-footer">
        <div className="system-pill"><span className="live-dot"/>Operación conectada</div>
        <button className="nav-item nav-button" onClick={()=>void signOut()}><span className="nav-key">↗</span><span className="nav-label">Cerrar sesión</span></button>
      </div>
    </aside>

    {mobileOpen?<button className="mobile-scrim" aria-label="Cerrar menú" onClick={()=>setMobileOpen(false)}/>:null}
    {mobileOpen?<aside className="mobile-drawer open" aria-label="Menú móvil">
      <div className="mobile-drawer-head"><strong>ManeComb</strong><button type="button" className="icon-action" onClick={()=>setMobileOpen(false)} aria-label="Cerrar menú">×</button></div>
      {groups.flatMap(group=>group.items).map(item=><Link key={item.href} href={item.href} className={"mobile-drawer-link "+(pathname.startsWith(item.href)?"active":"")}><span>{item.key}</span>{item.label}</Link>)}
      <button type="button" className="mobile-drawer-link danger" onClick={()=>void signOut()}><span>↗</span>Cerrar sesión</button>
    </aside>:null}

    <div className="product-workspace">
      <header className="workspace-topbar">
        <div className="topbar-left">
          <button className="mobile-menu-button" onClick={()=>setMobileOpen(true)} aria-label="Abrir menú">☰</button>
          <div><span className="workspace-context">Portal /</span> <strong>{current}</strong></div>
        </div>
        <div className="topbar-actions">
          <Link href="/portal/monitoreo" className="topbar-live"><span className="live-dot"/>Flota en vivo</Link>
          <ThemeToggle/>
        </div>
      </header>
      <main id="main-content" className="workspace-content" tabIndex={-1}>{children}</main>
    </div>
  </div>;
}
