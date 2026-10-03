import Link from "next/link";
import { Icon, type IconName } from "@/src/components/ui/icon";

export type MobileNavItem={href:string;label:string;icon:IconName;active:boolean};

export function MobileBottomNav({items,label="Navegación de operación"}:{items:readonly MobileNavItem[];label?:string}){
  return <nav className="mobile-v3-bottom-nav" aria-label={label}>
    {items.map(item=><Link key={item.href} href={item.href} className="mobile-v3-nav-item" aria-current={item.active?"page":undefined}>
      <Icon name={item.icon}/><span>{item.label}</span>
    </Link>)}
  </nav>;
}
