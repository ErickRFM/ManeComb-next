import Link from "next/link";
import {COMMERCIAL_PLANS} from "@/src/core/domain/commercial-plans";

const planMeta:Record<string,{eyebrow:string;copy:string;accent:string}> = {
  "fleet-2":{eyebrow:"ARRANQUE",copy:"Ideal para pilotos y patios pequeños.",accent:"cyan"},
  "fleet-4":{eyebrow:"MÁS ELEGIDO",copy:"Un punto de entrada equilibrado para la operación.",accent:"pink"},
  "fleet-6":{eyebrow:"CRECIMIENTO",copy:"Más capacidad con control operativo y seguimiento.",accent:"orange"},
  "fleet-8":{eyebrow:"COBERTURA",copy:"Para líneas con mayor operación y supervisión.",accent:"magenta"},
  "fleet-12":{eyebrow:"ESCALA",copy:"Capacidad amplia para una flota consolidada.",accent:"violet"}
};

export function PlanCards(){
  return <div className="plan-deck">
    {COMMERCIAL_PLANS.map(plan=>{
      const meta=planMeta[plan.code]||{eyebrow:"PLAN",copy:"Capacidad para tu operación.",accent:"pink"};
      const perUnit=Math.round(plan.monthlyMxn/plan.units);
      return <article className={"plan-card plan-accent-"+meta.accent} key={plan.code}>
        <div className="plan-card-top"><span className="plan-eyebrow">{meta.eyebrow}</span><span className="plan-unit-badge">{plan.units}</span></div>
        <h3>{plan.label}</h3>
        <p className="plan-copy">{meta.copy}</p>
        <div className="plan-price"><strong>{new Intl.NumberFormat("es-MX",{style:"currency",currency:"MXN",maximumFractionDigits:0}).format(plan.monthlyMxn)}</strong><span>/ mes</span></div>
        <ul className="plan-facts">
          <li>{plan.units} unidades incluidas</li>
          <li>${perUnit} MXN por unidad aprox.</li>
          <li>GPS, rutas, jornadas y gestión</li>
          <li>Chat y Radio disponibles</li>
        </ul>
        <Link className="btn plan-cta" href={"/checkout/"+plan.code}>Elegir {plan.label}</Link>
      </article>;
    })}
  </div>;
}
