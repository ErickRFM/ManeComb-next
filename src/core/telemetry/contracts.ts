export type { TelemetryInput, OperationalUnitSnapshot } from "@/src/core/contracts/telemetry";
export type DatabasePhase = <T>(phase:string,operation:()=>PromiseLike<T>)=>Promise<T>;
