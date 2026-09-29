import { ModuleShell } from "@/src/components/module-shell";
import { ContactForm } from "@/src/components/contact-form";
export default function ContactPage(){
  return <ModuleShell eyebrow="CONTACTO" title="Hablemos de tu operación" description="Cuéntanos cuántas unidades administras y qué necesitas mejorar."><ContactForm/></ModuleShell>
}
