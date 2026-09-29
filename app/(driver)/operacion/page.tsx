import { DriverConsole } from "@/src/components/driver-console";
import { JourneyPanel } from "@/src/components/journey-panel";
export default function OperationPage(){
  return <main className="driver"><div className="driver-panel grid"><JourneyPanel/><DriverConsole/></div></main>
}
