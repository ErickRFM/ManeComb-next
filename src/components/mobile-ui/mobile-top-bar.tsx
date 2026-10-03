import type { ReactNode } from "react";

export function MobileTopBar({title,leading,actions}:{title:ReactNode;leading?:ReactNode;actions?:ReactNode}){
  return <header className="mobile-v3-top-bar">
    {leading&&<div className="mobile-v3-top-leading">{leading}</div>}
    <div className="mobile-v3-top-title">{title}</div>
    {actions&&<div className="mobile-v3-top-actions">{actions}</div>}
  </header>;
}
