import {readFileSync} from "node:fs";
import {describe,expect,it} from "vitest";

const read=(path:string)=>readFileSync(new URL("../"+path,import.meta.url),"utf8");

describe("Android WebView bootstrap contract",()=>{
  it("refuses native preparation when generated Capacitor bootstrap is incomplete",()=>{
    const prepare=read("scripts/prepare-native-android.mjs");
    expect(prepare).toContain("assets/capacitor.config.json");
    expect(prepare).toContain("Generated Capacitor config has no server.url");
    expect(prepare).toContain("ManeComb Next has no bundled public/index.html");
    expect(prepare).toContain("expectedAppStartPath");
    expect(prepare).toContain("Generated Capacitor appStartPath mismatch");
    expect(prepare).toContain("native-error.html");
  });

  it("uses an origin plus appStartPath instead of hiding the route in server.url",()=>{
    const config=read("capacitor.config.ts");
    const target=read("src/lib/native-server-url.ts");
    expect(config).toContain("appStartPath:serverTarget.appStartPath");
    expect(config).toContain('errorPath:"native-error.html"');
    expect(target).toContain('appStartPath=parsed.pathname==="/" ? "/app" : parsed.pathname');
    expect(target).toContain("url:parsed.origin");
  });

  it("verifies the generated wrapper has a usable WebView source and fallback",()=>{
    const verify=read("scripts/verify-native-generated.mjs");
    expect(verify).toContain("Capacitor WebView has a bootstrap source");
    expect(verify).toContain("Capacitor appStartPath is configured");
    expect(verify).toContain("Capacitor installed entry uses /app");
    expect(verify).toContain("Capacitor native error page configured");
    expect(verify).toContain("Capacitor production server uses HTTPS");
  });

  it("records the embedded server target in native build metadata",()=>{
    const report=read("scripts/report-native-build.mjs");
    expect(report).toContain("capacitorServerUrl");
    expect(report).toContain("capacitorAppStartPath");
    expect(report).toContain("capacitorErrorPath");
    expect(report).toContain("hasBundledIndexHtml");
  });
});
