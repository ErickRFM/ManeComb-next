import type {CSSProperties} from "react";
const paths={
  map:"M9 3 3 6v15l6-3 6 3 6-3V3l-6 3-6-3Zm0 0v15m6-12v15",
  summary:"M4 20V10m8 10V4m8 16v-7M2 22h20",
  vehicle:"M5 17H3V7h12v10H9m6-8h4l3 5v3h-3M5 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0Zm10 0a2 2 0 1 0 4 0 2 2 0 0 0-4 0Z",
  route:"M5 5h9a4 4 0 0 1 0 8H9a4 4 0 0 0 0 8h10M3 3l4 4m0-4L3 7m14 12 2 2-2 2",
  users:"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m18 0v-2a4 4 0 0 0-3-4M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm8 0a4 4 0 0 1 0 8",
  document:"M14 2H4v20h16V8l-6-6Zm0 0v6h6M8 12h8m-8 4h8",
  chat:"M21 11a8 8 0 0 1-8 8H7l-5 3V11a9 9 0 0 1 19 0ZM7 10h10m-10 4h6",
  radio:"M7 3v5m10-5v5M5 8h14v14H5V8Zm3 4h8m-4 3a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z",
  microphone:"M9 5a3 3 0 0 1 6 0v7a3 3 0 0 1-6 0V5Zm-3 6v1a6 6 0 0 0 12 0v-1M12 18v4m-4 0h8",
  alert:"m12 3 10 18H2L12 3Zm0 6v5m0 3v1",
  billing:"M5 2h14v20l-3-2-4 2-4-2-3 2V2Zm3 5h8m-8 5h8m-8 5h4",
  more:"M4 11v2m8-2v2m8-2v2",
  logout:"M9 3H3v18h6m6-15 6 6-6 6M8 12h13",
  menu:"M3 5h18M3 12h18M3 19h18",
  close:"m5 5 14 14M19 5 5 19",
  back:"m15 5-7 7 7 7",
  location:"M12 3v3m0 12v3M3 12h3m12 0h3M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10Z"
  ,search:"M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm5 12 6 6"
};
export type IconName=keyof typeof paths;
export function Icon({name,size=20,style}:{name:IconName;size?:number;style?:CSSProperties}){
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" style={style}><path d={paths[name]}/></svg>;
}
