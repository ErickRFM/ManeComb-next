import {expect,it} from "vitest";
import {nativeServerTarget,nativeServerUrl} from "@/src/lib/native-server-url";

it("starts installed apps at session-aware operation rather than sales",()=>{
  expect(nativeServerUrl("https://manecomb.com")).toBe("https://manecomb.com/app");
  expect(nativeServerUrl("http://10.0.2.2:3000/")).toBe("http://10.0.2.2:3000/app");
  expect(nativeServerTarget("https://manecomb.com")).toEqual({url:"https://manecomb.com",appStartPath:"/app"});
});

it("preserves explicit Android smoke and deployment paths",()=>{
  expect(nativeServerUrl("http://10.0.2.2:3000/visual-qa/driver")).toBe("http://10.0.2.2:3000/visual-qa/driver");
  expect(nativeServerTarget("http://10.0.2.2:3000/visual-qa/driver")).toEqual({
    url:"http://10.0.2.2:3000",
    appStartPath:"/visual-qa/driver"
  });
  expect(nativeServerUrl(undefined)).toBeUndefined();
  expect(nativeServerTarget(undefined)).toBeUndefined();
});
