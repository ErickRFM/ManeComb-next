import {expect,it} from "vitest";
import {closestSheetLevel} from "@/src/components/mobile-ui/sheet-geometry";
const heights=Object.freeze({compact:128,medium:300,expanded:600});
it.each([[0,"compact"],[128,"compact"],[200,"compact"],[260,"medium"],[300,"medium"],[410,"medium"],[500,"expanded"],[900,"expanded"]] as const)("snaps height %s to closest confirmed stage %s",(height,level)=>{
  expect(closestSheetLevel(height,heights,"medium")).toBe(level);
});
it.each(["compact","medium","expanded"] as const)("a closest-height tie preserves previous %s even outside the tied pair",previous=>{
  expect(closestSheetLevel(214,heights,previous)).toBe(previous);
  expect(closestSheetLevel(450,heights,previous)).toBe(previous);
});
it("uses actual short-layout targets without changing the supplied geometry",()=>{
  const short=Object.freeze({compact:112,medium:170,expanded:218});
  expect(closestSheetLevel(200,short,"compact")).toBe("expanded");
  expect(short).toEqual({compact:112,medium:170,expanded:218});
});
