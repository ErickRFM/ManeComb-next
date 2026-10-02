import { Reveal } from "@/src/components/ui/reveal";

const steps=[
  {number:"01",title:"Crea tu empresa",copy:"Elige la capacidad de tu flota y configura la cuenta responsable."},
  {number:"02",title:"Conecta tu flota",copy:"Registra unidades, conductores y rutas sin duplicar herramientas."},
  {number:"03",title:"Opera en tiempo real",copy:"Inicia jornadas y coordina seguimiento, chat, radio e incidencias."}
];

export function MarketingProcess(){
  return <section className="marketing-v3-section marketing-process-section">
    <Reveal><div className="marketing-v3-section-head compact"><span className="marketing-kicker">DE CONFIGURACIÓN A OPERACIÓN</span><h2>Tres pasos. Una sola línea de trabajo.</h2></div></Reveal>
    <ol className="marketing-process">
      {steps.map((step,index)=><Reveal key={step.number} className="marketing-process-reveal" delay={index*90}><li><div className="marketing-process-number">{step.number}</div><div className="marketing-process-line" aria-hidden="true"><i/></div><h3>{step.title}</h3><p>{step.copy}</p></li></Reveal>)}
    </ol>
  </section>;
}
