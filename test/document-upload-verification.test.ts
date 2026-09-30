import { afterEach,beforeEach,expect,it,vi } from "vitest";
const create=vi.hoisted(()=>vi.fn(async(input:any)=>({...input,_id:"document",toObject:()=>({...input})})));
vi.mock("@/src/lib/auth",()=>({requireApiSession:async()=>({organizationId:"tenant-a",sub:"owner",channel:"company_portal",roles:["owner"]})}));
vi.mock("@/src/lib/db",()=>({connectDb:async()=>undefined}));
vi.mock("@/src/core/models/Document",()=>({Document:{create}}));
vi.mock("@/src/core/services/audit",()=>({writeAudit:async()=>undefined}));
import {POST} from "@/app/api/documents/route";
const input={ownerType:"organization",kind:"insurance",url:"https://res.cloudinary.com/qa-cloud/image/authenticated/v123/manecomb/tenant-a/document/receipt.pdf",storagePublicId:"manecomb/tenant-a/document/receipt",resourceType:"image",bytes:1024,mimeType:"application/pdf"};
beforeEach(()=>{
  vi.clearAllMocks();
  vi.stubEnv("CLOUDINARY_CLOUD_NAME","qa-cloud");vi.stubEnv("CLOUDINARY_API_KEY","qa-key");vi.stubEnv("CLOUDINARY_API_SECRET","qa-secret");
});
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals()});
it("rejects an oversized provider asset despite a forged small client byte count",async()=>{
  vi.stubGlobal("fetch",vi.fn(async()=>Response.json({public_id:input.storagePublicId,resource_type:"image",type:"authenticated",version:123,format:"pdf",bytes:15*1024*1024})));
  const response=await POST(new Request("http://localhost/api/documents",{method:"POST",body:JSON.stringify(input)}));
  expect(response.status).toBe(400);
  expect(create).not.toHaveBeenCalled();
});
it("persists only metadata confirmed by the provider",async()=>{
  vi.stubGlobal("fetch",vi.fn(async()=>Response.json({public_id:input.storagePublicId,resource_type:"image",type:"authenticated",version:123,format:"pdf",bytes:1024})));
  const response=await POST(new Request("http://localhost/api/documents",{method:"POST",body:JSON.stringify(input)}));
  expect(response.status).toBe(201);
  expect(create).toHaveBeenCalledOnce();
});
