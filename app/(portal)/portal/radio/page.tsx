import { ModuleShell } from "@/src/components/module-shell";
import { RadioConsole } from "@/src/components/radio-console";
import { RtcConsole } from "@/src/components/rtc-console";
import { ChatConsole } from "@/src/components/chat-console";

export default function RadioPage(){
  return <ModuleShell eyebrow="COMUNICACIÓN" title="Centro de comunicaciones" description="Radio PTT, llamadas y mensajería bajo la misma operación y el mismo tenant." wide>
    <div className="communications-layout">
      <div className="communications-side"><RadioConsole/><RtcConsole/></div>
      <ChatConsole/>
    </div>
  </ModuleShell>;
}
