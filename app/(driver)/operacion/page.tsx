import { DriverConsole } from "@/src/components/driver-console";
import { DriverMapHome } from "@/src/components/driver-map-home";
import { JourneyPanel } from "@/src/components/journey-panel";
import { PushOptIn } from "@/src/components/push-opt-in";
import { AppVersionGate } from "@/src/components/app-version-gate";

export default function OperationPage(){
  return <div className="driver-home">
    <AppVersionGate/>
    <DriverMapHome/>
    <details className="driver-tools" id="controles-jornada">
      <summary><span>Controles de jornada y GPS</span><small>Checklist, iniciar/pausar/finalizar y diagnóstico de seguimiento</small></summary>
      <div className="driver-tools-body">
        <JourneyPanel/>
        <DriverConsole/>
        <PushOptIn/>
      </div>
    </details>
  </div>;
}
