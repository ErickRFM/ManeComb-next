import type { GpsFreshness } from "@/src/core/contracts/telemetry";
import { MobileStatus, type MobileTone } from "./mobile-status";

const states=new Map<GpsFreshness,{label:string;tone:MobileTone}>([
  ["live",{label:"En vivo",tone:"success"}],
  ["delayed",{label:"Reporte demorado",tone:"warning"}],
  ["stale",{label:"Dato antiguo",tone:"warning"}],
  ["lost",{label:"Sin señal reciente",tone:"danger"}],
  ["never_reported",{label:"Sin reportes",tone:"neutral"}]
]);

export function MobileFreshness({freshness,recordedAt}:{freshness:GpsFreshness;recordedAt:string|null}){
  const state=states.get(freshness)??{label:"Estado GPS no disponible",tone:"neutral" as const};
  const date=recordedAt?new Date(recordedAt):null;
  const valid=date!==null&&Number.isFinite(date.getTime());
  return <div className="mobile-v3-freshness">
    <MobileStatus label={state.label} tone={state.tone} icon="location"/>
    {valid?<time dateTime={recordedAt!} suppressHydrationWarning>{date.toLocaleString("es-MX")}</time>:<span>Hora no disponible</span>}
  </div>;
}
