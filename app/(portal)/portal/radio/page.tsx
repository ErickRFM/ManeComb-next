import { ModuleShell } from "@/src/components/module-shell";
import { RadioConsole } from "@/src/components/radio-console";
import { RtcConsole } from "@/src/components/rtc-console";
export default function RadioPage(){
  return <ModuleShell eyebrow="COMUNICACIÓN" title="Despachador de Radio y llamadas" description="PTT con control de piso y llamadas WebRTC señalizadas sólo entre usuarios del mismo tenant."><div className="grid grid-3"><RadioConsole/><RtcConsole/><div className="card"><h3>Chat</h3><p className="muted">Mensajes persistentes e idempotentes con entrega por Socket.IO.</p></div></div></ModuleShell>
}
