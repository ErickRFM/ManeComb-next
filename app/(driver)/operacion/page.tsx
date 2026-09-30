import { DriverConsole } from "@/src/components/driver-console";
import { JourneyPanel } from "@/src/components/journey-panel";
import { PushOptIn } from "@/src/components/push-opt-in";
import { AppVersionGate } from "@/src/components/app-version-gate";

export default function OperationPage(){
  return <main className="driver">
    <AppVersionGate/>
    <div className="driver-panel grid">
      <JourneyPanel/>
      <DriverConsole/>
      <PushOptIn/>
    </div>
  </main>
}
