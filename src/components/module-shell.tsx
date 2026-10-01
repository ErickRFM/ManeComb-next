"use client";

import { usePathname } from "next/navigation";
import { Navigation } from "@/src/components/navigation";

export function ModuleShell(props:{eyebrow?:string;title:string;description:string;children?:React.ReactNode;wide?:boolean;operation?:boolean}) {
  const pathname=usePathname();
  const embedded=pathname.startsWith("/portal")||pathname.startsWith("/admin")||pathname.startsWith("/operacion");
  const content=<section className={"module-section "+(props.wide?"module-wide":"")+(props.operation?" operation-access":"")}>
    <header className="module-header">
      <div>{props.operation?<div className="operation-wordmark" aria-label="ManeComb"><span>Mane</span>Comb</div>:props.eyebrow?<span className="eyebrow">{props.eyebrow}</span>:null}<h1 className="module-title">{props.title}</h1><p className="module-copy">{props.description}</p></div>
    </header>
    <div className="module-body">{props.children}</div>
  </section>;

  if(embedded)return content;
  return <div className="shell">{!props.operation?<Navigation/>:null}<main id="main-content" className="page">{content}</main></div>;
}
