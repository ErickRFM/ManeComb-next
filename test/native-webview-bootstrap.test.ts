import {readFileSync} from "node:fs";
import {describe,expect,it} from "vitest";

const read=(path:string)=>readFileSync(new URL("../"+path,import.meta.url),"utf8");

describe("Android WebView bootstrap contract",()=>{
  it("refuses native preparation when generated Capacitor server bootstrap is missing",()=>{
    const prepare=read("scripts/prepare-native-android.mjs");
    expect(prepare).toContain("assets/capacitor.config.json");
    expect(prepare).toContain("Generated Capacitor config has no server.url");
    expect(prepare).toContain("ManeComb Next has no bundled public/index.html");
    expect(prepare).toContain('parsed.pathname==="/"');
    expect(prepare).toContain('parsed.pathname="/app"');
  });

  it("verifies the generated wrapper has a usable WebView source",()=>{
    const verify=read("scripts/verify-native-generated.mjs");
    expect(verify).toContain("Capacitor WebView has a bootstrap source");
    expect(verify).toContain("Capacitor server enters through /app");
    expect(verify).toContain("Capacitor production server uses HTTPS");
    expect(verify).toContain("android/app/src/main/assets/public/index.html");
  });

  it("records the embedded server target in native build metadata",()=>{
    const report=read("scripts/report-native-build.mjs");
    expect(report).toContain("capacitorServerUrl");
    expect(report).toContain("hasBundledIndexHtml");
  });
});
