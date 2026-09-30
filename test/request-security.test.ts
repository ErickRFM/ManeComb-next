import { describe,expect,it } from "vitest";
import { isTrustedMutationRequest } from "@/src/lib/request-security";

const base={
  method:"POST",
  pathname:"/api/vehicles",
  origin:"https://manecomb.com",
  secFetchSite:"same-origin",
  authorization:null,
  hasSessionCookie:true,
  hasMfaCookie:false,
  appUrl:"https://manecomb.com",
  requestOrigin:"https://manecomb.com"
};

describe("request origin protection",()=>{
  it("allows same-origin cookie mutations",()=>expect(isTrustedMutationRequest(base)).toBe(true));
  it("blocks cross-origin cookie mutations",()=>expect(isTrustedMutationRequest({...base,origin:"https://evil.example",secFetchSite:"cross-site"})).toBe(false));
  it("blocks missing-origin cookie mutations unless browser reports same-origin",()=>expect(isTrustedMutationRequest({...base,origin:null,secFetchSite:"cross-site"})).toBe(false));
  it("allows device bearer telemetry without browser Origin",()=>expect(isTrustedMutationRequest({...base,pathname:"/api/locations/telemetry",origin:null,secFetchSite:null,authorization:"Bearer mcdev_token"})).toBe(true));
  it("allows the signed Mercado Pago webhook",()=>expect(isTrustedMutationRequest({...base,pathname:"/api/webhooks/mercadopago",origin:null,secFetchSite:null,hasSessionCookie:false})).toBe(true));
  it("does not impose CSRF checks on safe requests",()=>expect(isTrustedMutationRequest({...base,method:"GET",origin:"https://evil.example"})).toBe(true));
});
