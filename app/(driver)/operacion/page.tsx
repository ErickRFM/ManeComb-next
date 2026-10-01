import { DriverMapHome } from "@/src/components/driver-map-home";
import { AppVersionGate } from "@/src/components/app-version-gate";

export default function OperationPage(){
  return <div className="driver-home">
    <AppVersionGate/>
    <DriverMapHome/>
  </div>;
}
