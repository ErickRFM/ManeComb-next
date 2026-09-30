import { ModuleShell } from "@/src/components/module-shell";
import { ChatConsole } from "@/src/components/chat-console";
export default function DriverChatPage(){return <ModuleShell eyebrow="CHAT" title="Mensajes" description="Conversaciones operativas en tiempo real con historial y adjuntos." wide><ChatConsole/></ModuleShell>}
