import type { ReactNode } from "react";

export function MobileSection({title,children,action,id}:{title:string;children:ReactNode;action?:ReactNode;id?:string}){
  return <section className="mobile-v3-section" id={id}>
    <header className="mobile-v3-section-head"><h2 className="mobile-v3-section-title">{title}</h2>{action}</header>
    {children}
  </section>;
}
