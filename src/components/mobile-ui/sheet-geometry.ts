import type {SheetLevel} from "./sheet-handle";

export function closestSheetLevel(height:number,heights:Record<SheetLevel,number>,previous:SheetLevel):SheetLevel{
  const levels:SheetLevel[]=["compact","medium","expanded"];
  const distances=levels.map(level=>({level,distance:Math.abs(heights[level]-height)}));
  const minimum=Math.min(...distances.map(item=>item.distance));
  const nearest=distances.filter(item=>Math.abs(item.distance-minimum)<1e-6);
  return nearest.length===1?nearest[0].level:previous;
}
