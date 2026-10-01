import { ModuleShell } from "@/src/components/module-shell";
import { RadioConsole } from "@/src/components/radio-console";
import { RtcConsole } from "@/src/components/rtc-console";

export default function RadioPage(){
  return <ModuleShell eyebrow="COMUNICACIÓN" title="Radio / RTC" description="Radio PTT y llamadas de tu organización. El chat está disponible en su propia vista." wide>
    <div className="communications-layout">
      <div className="communications-side"><RadioConsole/><RtcConsole/></div>
    </div>
  </ModuleShell>;
}
