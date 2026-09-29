import { DriverConsole } from "@/src/components/driver-console";
import { JourneyPanel } from "@/src/components/journey-panel";
import { PushOptIn } from "@/src/components/push-opt-in";
export default function OperationPage(){
  return <main className="driver"><div className="driver-panel grid"><JourneyPanel/><DriverConsole/><PushOptIn/></div></main>
}
