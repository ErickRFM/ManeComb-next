"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/src/components/theme-toggle";
import { useNetworkStatus } from "@/src/hooks/useNetworkStatus";
import {Icon,type IconName} from "@/src/components/ui/icon";

const tabs=[
  {label:"Mapa",href:"/operacion",key:"map",exact:true},
  {label:"Chat",href:"/operacion/chat",key:"chat"},
  {label:"Radio",href:"/operacion/radio",key:"radio"},
  {label:"Alertas",href:"/operacion/alertas",key:"alert"},
  {label:"Más",href:"/operacion/mas",key:"more"}
];

export function DriverShell({children}:{children:React.ReactNode}){
  const pathname=usePathname();
  const online=useNetworkStatus();
  return <div className="driver-shell">
    <header className="driver-topbar">
      <Link href="/operacion" className="driver-brand"><span className="brand-mark compact">MC</span><span><strong>ManeComb</strong><small>Operación</small></span></Link>
      <div className="driver-top-actions"><Link href="/operacion/sos" className="btn secondary" aria-label="Reportar emergencia SOS">SOS</Link><span className="driver-connection" aria-live="polite"><span className="live-dot" style={online===false?{background:"var(--danger)"}:undefined}/>{online===null?"Consultando red":online?"Red disponible":"Sin red"}</span><ThemeToggle/></div>
    </header>
    <main id="main-content" className="driver-workspace" tabIndex={-1}>{children}</main>
    <nav className="driver-tabbar" aria-label="Navegación de operación">
      {tabs.map(tab=>{
        const active=tab.exact?pathname===tab.href:pathname.startsWith(tab.href);
        return <Link key={tab.href} href={tab.href} className={"driver-tab "+(active?"active":"")+" "+(tab.label==="SOS"?"sos":"")} aria-current={active?"page":undefined}>
          <span className="driver-tab-icon"><Icon name={tab.key as IconName}/></span><span>{tab.label}</span>
        </Link>;
      })}
    </nav>
  </div>;
}
