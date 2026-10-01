import { ModuleShell } from "@/src/components/module-shell";
import { RadioConsole } from "@/src/components/radio-console";
import {RtcConsole} from "@/src/components/rtc-console";
export default function DriverRadioPage(){return <ModuleShell eyebrow="COMUNICACIÓN" title="Radio y llamadas" description="Habla por turnos o llama a una persona de tu empresa."><div className="grid"><RadioConsole/><RtcConsole/></div></ModuleShell>}
