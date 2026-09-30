"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/src/components/theme-toggle";

const tabs=[
  {label:"Inicio",href:"/operacion",key:"●",exact:true},
  {label:"Ruta",href:"/operacion/navegacion",key:"↗"},
  {label:"Chat",href:"/operacion/chat",key:"▤"},
  {label:"Radio",href:"/operacion/radio",key:"◉"},
  {label:"SOS",href:"/operacion/sos",key:"!"}
];

export function DriverShell({children}:{children:React.ReactNode}){
  const pathname=usePathname();
  return <div className="driver-shell">
    <header className="driver-topbar">
      <Link href="/operacion" className="driver-brand"><span className="brand-mark compact">MC</span><span><strong>ManeComb</strong><small>Operación</small></span></Link>
      <div className="driver-top-actions"><span className="driver-connection"><span className="live-dot"/>En línea</span><ThemeToggle/></div>
    </header>
    <main id="main-content" className="driver-workspace" tabIndex={-1}>{children}</main>
    <nav className="driver-tabbar" aria-label="Navegación de operación">
      {tabs.map(tab=>{
        const active=tab.exact?pathname===tab.href:pathname.startsWith(tab.href);
        return <Link key={tab.href} href={tab.href} className={"driver-tab "+(active?"active":"")+" "+(tab.label==="SOS"?"sos":"")} aria-current={active?"page":undefined}>
          <span className="driver-tab-icon">{tab.key}</span><span>{tab.label}</span>
        </Link>;
      })}
    </nav>
  </div>;
}
