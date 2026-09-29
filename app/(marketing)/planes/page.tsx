import Link from "next/link";
import { ModuleShell } from "@/src/components/module-shell";
const plans=[["2 combis","$99"],["4 combis","$159"],["6 combis","$289"],["8 combis","$449"],["12 combis","$729"]];
export default function PlansPage(){return <ModuleShell eyebrow="PLANES" title="Escala conforme crece tu línea" description="Precios mensuales en MXN. El backend conserva la autoridad final sobre plan, estado y permisos."><div className="grid grid-3">{plans.map(([name,price])=><div className="card" key={name}><h3>{name}</h3><div className="kpi">{price}</div><p className="muted">Monitoreo, rutas, operación y gestión.</p><Link className="btn" href={"/checkout/"+name.split(" ")[0]}>Elegir</Link></div>)}</div></ModuleShell>}
