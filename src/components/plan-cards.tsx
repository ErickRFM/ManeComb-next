import Link from "next/link";
import {COMMERCIAL_PLANS} from "@/src/core/domain/commercial-plans";

const planMeta:Record<string,{eyebrow:string;copy:string;featured?:boolean}> = {
  "fleet-2":{eyebrow:"ARRANQUE",copy:"Para comenzar a operar con una flotilla compacta."},
  "fleet-4":{eyebrow:"MÁS ELEGIDO",copy:"Capacidad equilibrada para operación diaria.",featured:true},
  "fleet-6":{eyebrow:"CRECIMIENTO",copy:"Más unidades sin cambiar de plataforma."},
  "fleet-8":{eyebrow:"COBERTURA",copy:"Para líneas con mayor supervisión operativa."},
  "fleet-12":{eyebrow:"ESCALA",copy:"Capacidad amplia para una flotilla consolidada."}
};

export function PlanCards(){
  return <div className="plan-deck">
    {COMMERCIAL_PLANS.map(plan=>{
      const meta=planMeta[plan.code]||{eyebrow:"PLAN",copy:"Capacidad para tu operación."};
      const perUnit=Math.round(plan.monthlyMxn/plan.units);
      return <article className={"plan-card"+(meta.featured?" is-featured":"")} key={plan.code}>
        <div className="plan-card-top"><span className="plan-eyebrow">{meta.eyebrow}</span><span className="plan-unit-badge">{plan.units}</span></div>
        <h3>{plan.label}</h3>
        <p className="plan-copy">{meta.copy}</p>
        <div className="plan-price"><strong>{new Intl.NumberFormat("es-MX",{style:"currency",currency:"MXN",maximumFractionDigits:0}).format(plan.monthlyMxn)}</strong><span>/ mes</span></div>
        <ul className="plan-facts">
          <li>{plan.units} unidades incluidas</li>
          <li>{perUnit} MXN por unidad aprox.</li>
          <li>GPS, rutas y jornadas</li>
          <li>Chat y Radio disponibles</li>
        </ul>
        <Link className="btn plan-cta" data-critical-action href={"/checkout/"+plan.code}>Elegir {plan.label}</Link>
      </article>;
    })}
  </div>;
}
