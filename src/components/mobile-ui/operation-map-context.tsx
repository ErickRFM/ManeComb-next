"use client";

import {createContext,useContext,useState,type ReactNode} from "react";
import type {OperationalUnitSnapshot} from "@/src/core/contracts/telemetry";

// Presentation read model only: the map remains the sole navigation/snapshot authority.
export type OperationMapData={
  journey:null|{id:string;state:string;vehicleId:string;routeId:string|null;startedAt:string|null};
  route:null|{id:string;name:string;origin?:string|null;destination?:string|null;revision:number;geometry:Array<{latitude:number;longitude:number}>;stops:any[]};
  snapshot:OperationalUnitSnapshot|null;
};
const Data=createContext<OperationMapData|null>(null);
const Publish=createContext<(data:OperationMapData|null)=>void>(()=>{});
const FeedbackHost=createContext<HTMLElement|null>(null);
const SetFeedbackHost=createContext<(node:HTMLElement|null)=>void>(()=>{});
export function OperationMapProvider({children}:{children:ReactNode}){
  const [data,publish]=useState<OperationMapData|null>(null);
  const [host,setHost]=useState<HTMLElement|null>(null);
  return <SetFeedbackHost.Provider value={setHost}><FeedbackHost.Provider value={host}><Publish.Provider value={publish}><Data.Provider value={data}>{children}</Data.Provider></Publish.Provider></FeedbackHost.Provider></SetFeedbackHost.Provider>;
}
export const useOperationMapData=()=>useContext(Data);
export const usePublishOperationMap=()=>useContext(Publish);
export const useMapFeedbackHost=()=>useContext(FeedbackHost);
export const useSetMapFeedbackHost=()=>useContext(SetFeedbackHost);
