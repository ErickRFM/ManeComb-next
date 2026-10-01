import {afterEach,expect,it,vi} from "vitest";
import {NextRequest} from "next/server";
import {SignJWT} from "jose";
import {middleware} from "@/middleware";
afterEach(()=>vi.unstubAllEnvs());
it.each([undefined,"invalid"])("retains operational login after a missing or invalid session (%s)",async token=>{
  vi.stubEnv("AUTH_SECRET","redirect-qa-secret-abcdefghijklmnopqrstuvwxyz");
  const response=await middleware(new NextRequest("http://localhost/operacion/chat",{headers:token?{cookie:"manecomb_session="+token}:{}}));
  const location=new URL(response.headers.get("location")!);expect(location.pathname).toBe("/login");expect(location.searchParams.get("surface")).toBe("operation");
});
it("keeps commercial login for the Portal but operational login for a channel mismatch",async()=>{
  const secret="redirect-qa-secret-abcdefghijklmnopqrstuvwxyz";vi.stubEnv("AUTH_SECRET",secret);
  const token=await new SignJWT({channel:"company_portal"}).setProtectedHeader({alg:"HS256"}).setExpirationTime("5m").sign(new TextEncoder().encode(secret));
  const mismatch=await middleware(new NextRequest("http://localhost/operacion",{headers:{cookie:"manecomb_session="+token}}));
  expect(new URL(mismatch.headers.get("location")!).searchParams.get("surface")).toBe("operation");
  const portal=await middleware(new NextRequest("http://localhost/portal/monitoreo"));expect(new URL(portal.headers.get("location")!).searchParams.get("surface")).toBeNull();
});
