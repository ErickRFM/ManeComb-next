"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { BrandLogo } from "@/src/components/brand-logo";
import { Icon } from "@/src/components/ui/icon";

export function Navigation(){
  const pathname=usePathname();
  const [scrolled,setScrolled]=useState(false);
  const [mobileOpen,setMobileOpen]=useState(false);

  useEffect(()=>{
    const sync=()=>setScrolled(window.scrollY>20);
    const onKeyDown=(event:KeyboardEvent)=>{if(event.key==="Escape")setMobileOpen(false)};
    sync();
    window.addEventListener("scroll",sync,{passive:true});
    window.addEventListener("keydown",onKeyDown);
    return()=>{
      window.removeEventListener("scroll",sync);
      window.removeEventListener("keydown",onKeyDown);
    };
  },[]);

  useEffect(()=>setMobileOpen(false),[pathname]);

  const onLogin=pathname==="/login";
  return <nav className={"nav marketing-nav"+(scrolled?" is-scrolled":"")+(mobileOpen?" mobile-open":"")} aria-label="Navegación principal">
    <div className="nav-inner">
      <Link href="/" className="nav-brand" aria-label="ManeComb inicio"><BrandLogo size="md"/></Link>
      <div className="nav-links">
        <Link href="/#producto">Producto</Link>
        <Link href="/#modulos">Soluciones</Link>
        <Link href="/planes">Planes</Link>
        <Link href="/contacto">Contacto</Link>
      </div>
      <div className="marketing-nav-actions">
        {!onLogin?<Link className="marketing-nav-login" href="/login">Entrar</Link>:null}
        <Link className="btn marketing-nav-primary" data-critical-action href="/registro">{onLogin?"Crear cuenta":"Comenzar"}</Link>
        <button
          type="button"
          className="marketing-nav-menu-button"
          aria-label={mobileOpen?"Cerrar menú":"Abrir menú"}
          aria-expanded={mobileOpen}
          aria-controls="marketing-mobile-menu"
          onClick={()=>setMobileOpen(open=>!open)}
        ><Icon name={mobileOpen?"close":"menu"} size={18}/></button>
      </div>
    </div>
    <div id="marketing-mobile-menu" className="marketing-mobile-nav" hidden={!mobileOpen}>
      <Link href="/#producto">Producto</Link>
      <Link href="/#modulos">Soluciones</Link>
      <Link href="/planes">Planes</Link>
      <Link href="/contacto">Contacto</Link>
      {!onLogin?<Link href="/login">Entrar</Link>:null}
    </div>
  </nav>;
}
