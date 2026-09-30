"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ThemeToggle } from "@/src/components/theme-toggle";

const items=[
  {label:"Empresas",href:"/admin/empresas",key:"ORG"},
  {label:"Pagos manuales",href:"/admin/pagos-manuales",key:"PAY"},
  {label:"Gobernanza",href:"/admin/gobernanza",key:"AUD"},
  {label:"Salud del sistema",href:"/admin/salud",key:"SYS"},
  {label:"Versiones App",href:"/admin/versiones",key:"APK"}
];

export function AdminShell({children}:{children:React.ReactNode}){
  const pathname=usePathname();
  const router=useRouter();
  const [mobileOpen,setMobileOpen]=useState(false);
  useEffect(()=>setMobileOpen(false),[pathname]);
  const current=useMemo(()=>items.find(item=>pathname.startsWith(item.href))?.label||"Administración",[pathname]);

  async function signOut(){
    await fetch("/api/auth/logout",{method:"POST"}).catch(()=>undefined);
    router.replace("/login");
    router.refresh();
  }

  return <div className="product-shell admin-product-shell">
    <aside className="product-sidebar admin-sidebar" aria-label="Administración global">
      <div className="sidebar-brand-row">
        <Link href="/admin/salud" className="product-brand"><span className="brand-mark">MC</span><span className="brand-copy"><strong>ManeComb</strong><small>Control global</small></span></Link>
      </div>
      <div className="admin-scope"><span>PLATAFORMA</span><strong>Administración global</strong></div>
      <nav className="product-nav">
        <div className="nav-group">
          <span className="nav-group-label">Gobierno</span>
          {items.map(item=>{
            const active=pathname.startsWith(item.href);
            return <Link key={item.href} href={item.href} className={"nav-item "+(active?"active":"")} aria-current={active?"page":undefined}><span className="nav-key">{item.key}</span><span className="nav-label">{item.label}</span></Link>;
          })}
        </div>
      </nav>
      <div className="sidebar-footer">
        <div className="system-pill admin"><span className="live-dot"/>MFA verificado</div>
        <button className="nav-item nav-button" onClick={()=>void signOut()}><span className="nav-key">↗</span><span className="nav-label">Cerrar sesión</span></button>
      </div>
    </aside>

    {mobileOpen?<button className="mobile-scrim" aria-label="Cerrar menú" onClick={()=>setMobileOpen(false)}/>:null}
    {mobileOpen?<aside className="mobile-drawer open" aria-label="Menú administrativo">
      <div className="mobile-drawer-head"><strong>Admin Global</strong><button type="button" className="icon-action" onClick={()=>setMobileOpen(false)} aria-label="Cerrar menú">×</button></div>
      {items.map(item=><Link key={item.href} href={item.href} className={"mobile-drawer-link "+(pathname.startsWith(item.href)?"active":"")}><span>{item.key}</span>{item.label}</Link>)}
    </aside>:null}

    <div className="product-workspace">
      <header className="workspace-topbar">
        <div className="topbar-left"><button className="mobile-menu-button" onClick={()=>setMobileOpen(true)} aria-label="Abrir menú">☰</button><div><span className="workspace-context">Admin /</span> <strong>{current}</strong></div></div>
        <div className="topbar-actions"><span className="admin-mode-pill">MODO PLATAFORMA</span><ThemeToggle/></div>
      </header>
      <main id="main-content" className="workspace-content" tabIndex={-1}>{children}</main>
    </div>
  </div>;
}
