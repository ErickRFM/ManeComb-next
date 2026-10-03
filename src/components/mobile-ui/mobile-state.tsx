import type { ReactNode } from "react";
import { Icon } from "@/src/components/ui/icon";

export function MobileEmptyState({title,message,action}:{title:string;message:string;action?:ReactNode}){
  return <div className="mobile-v3-state"><Icon name="document"/><h3 className="mobile-v3-state-title">{title}</h3><p className="mobile-v3-state-copy">{message}</p>{action}</div>;
}

export function MobileErrorState({title,message,onRetry,retryDisabled=false}:{title:string;message:string;onRetry?:()=>void;retryDisabled?:boolean}){
  return <div className="mobile-v3-state" role="alert"><Icon name="alert"/><h3 className="mobile-v3-state-title">{title}</h3><p className="mobile-v3-state-copy">{message}</p>
    {onRetry&&<button className="mobile-v3-button" type="button" disabled={retryDisabled} onClick={()=>{if(!retryDisabled)onRetry()}}>Reintentar</button>}
  </div>;
}

export function MobileLoadingState({label}:{label:string}){
  return <div className="mobile-v3-state" role="status" aria-live="polite" aria-busy="true"><Icon name="more"/><span>{label}</span></div>;
}
