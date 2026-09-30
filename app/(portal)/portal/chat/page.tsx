import { ChatConsole } from "@/src/components/chat-console";
import { ModuleShell } from "@/src/components/module-shell";

export default function PortalChatPage(){
  return <ModuleShell eyebrow="COMUNICACIÓN" title="Chat" description="Conversaciones directas y canal general de tu organización." wide><ChatConsole/></ModuleShell>;
}
