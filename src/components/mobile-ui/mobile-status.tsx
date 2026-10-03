import { Icon, type IconName } from "@/src/components/ui/icon";

export type MobileTone = "neutral" | "success" | "warning" | "danger";

export function MobileStatus({label,tone="neutral",icon,announce=false}:{label:string;tone?:MobileTone;icon?:IconName;announce?:boolean}){
  return <span className="mobile-v3-status" data-tone={tone} role={announce?"status":undefined} aria-live={announce?"polite":undefined}>
    {icon&&<Icon name={icon} size={16}/>}<span>{label}</span>
  </span>;
}
