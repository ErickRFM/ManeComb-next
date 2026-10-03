import {readFileSync} from "node:fs";
import {describe,expect,it} from "vitest";

const read=(path:string)=>readFileSync(new URL("../"+path,import.meta.url),"utf8");

describe("operation mobile auth parity",()=>{
  it("keeps installed operation login separate from commercial login",()=>{
    const page=read("app/(auth)/login/page.tsx");
    expect(page).toContain('params.surface==="operation"');
    expect(page).toContain("<OperationAuthLayout");
    expect(page).toContain("auth-premium-shell");
  });

  it("restores the certified mobile access composition",()=>{
    const layout=read("src/components/operation-auth-layout.tsx");
    expect(layout).toContain("manecomb-mobile-faster.png");
    expect(layout).toContain("Siguiendo lo importante.");
    expect(layout).toContain("Iniciar sesión");
    expect(layout).toContain("Registrarse");
    expect(layout).toContain("/activar?surface=operation");
  });

  it("replaces the raw session-check page with a branded state",()=>{
    const entry=read("src/components/operation-entry.tsx");
    const loading=read("src/components/operation-session-loading.tsx");
    expect(entry).toContain("OperationSessionLoading");
    expect(entry).not.toContain("<h1>ManeComb</h1>");
    expect(loading).toContain("Preparando ManeComb");
  });

  it("keeps the operation login light and isolated from product dark surfaces",()=>{
    const css=read("src/styles/operation-auth.css");
    expect(css).toContain("background:#fff");
    expect(css).toContain(".operation-auth-segment");
    expect(css).toContain(".operation-auth-artwork");
    expect(css).toContain("@media(max-width:390px)");
  });
});
