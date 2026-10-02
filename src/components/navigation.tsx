"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { BrandLogo } from "@/src/components/brand-logo";

export function Navigation(){
  const pathname=usePathname();
  const [scrolled,setScrolled]=useState(false);

  useEffect(()=>{
    const sync=()=>setScrolled(window.scrollY>20);
    sync();
    window.addEventListener("scroll",sync,{passive:true});
    return()=>window.removeEventListener("scroll",sync);
  },[]);

  const onLogin=pathname==="/login";
  return <nav className={"nav marketing-nav"+(scrolled?" is-scrolled":"")} aria-label="Navegación principal">
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
        <Link className="btn marketing-nav-primary" href="/registro">{onLogin?"Crear cuenta":"Comenzar"}</Link>
      </div>
    </div>
  </nav>;
}
