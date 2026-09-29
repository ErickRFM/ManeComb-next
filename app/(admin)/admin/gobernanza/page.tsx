import { ModuleShell } from "@/src/components/module-shell";
import { AuditPanel } from "@/src/components/audit-panel";
export default function GovernancePage(){
  return <ModuleShell eyebrow="AUDITORÍA" title="Gobernanza y seguridad" description="Eventos críticos, cambios de estado, pagos, jornadas y mutaciones administrativas."><AuditPanel/></ModuleShell>
}
