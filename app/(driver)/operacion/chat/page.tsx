import { ModuleShell } from "@/src/components/module-shell";
import { ChatConsole } from "@/src/components/chat-console";
export default function DriverChatPage(){return <ModuleShell eyebrow="CHAT" title="Mensajes" description="Directorio de la empresa y canal central, con historial y adjuntos." wide><ChatConsole operation/></ModuleShell>}
