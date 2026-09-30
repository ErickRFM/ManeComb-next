import { afterEach, expect, it, vi } from "vitest";
import { assertTenantCloudinaryAsset,proxyTrustedCloudinaryAsset } from "@/src/lib/cloudinary";
afterEach(() => {vi.unstubAllEnvs();vi.unstubAllGlobals()});
const asset = { organizationId: "tenant-a", kind: "document" as const, publicId: "manecomb/tenant-a/document/receipt" };
it("rejects a same-cloud URL for a different tenant than the supplied public ID", () => {
  vi.stubEnv("CLOUDINARY_CLOUD_NAME", "qa-cloud");
  expect(() => assertTenantCloudinaryAsset({ ...asset, url: "https://res.cloudinary.com/qa-cloud/image/upload/v123/manecomb/tenant-b/document/receipt.pdf" })).toThrow("INVALID_STORAGE_ASSET");
});
it("signs an authenticated download only after validating the persisted tenant identity",async()=>{
  vi.stubEnv("CLOUDINARY_CLOUD_NAME","qa-cloud");
  vi.stubEnv("CLOUDINARY_API_SECRET","qa-signing-secret");
  const upstream=vi.fn(async(_url:URL)=>new Response("image bytes",{headers:{"content-type":"image/jpeg"}}));
  vi.stubGlobal("fetch",upstream);
  const response=await proxyTrustedCloudinaryAsset("https://res.cloudinary.com/qa-cloud/image/authenticated/v123/manecomb/tenant-a/document/receipt.jpg",asset);
  expect(response.status).toBe(200);
  expect(String(upstream.mock.calls[0][0])).toMatch(/\/authenticated\/s--[A-Za-z0-9_-]{8}--\/v123\/manecomb\/tenant-a\/document\/receipt.jpg$/);
  expect(response.headers.get("cache-control")).toContain("no-store");
  await expect(proxyTrustedCloudinaryAsset("https://res.cloudinary.com/qa-cloud/image/authenticated/v123/manecomb/tenant-b/document/receipt.jpg",asset)).rejects.toThrow("INVALID_STORAGE_ASSET");
  expect(upstream).toHaveBeenCalledTimes(1);
});
it("requires authenticated delivery for all new tenant assets",()=>{
  vi.stubEnv("CLOUDINARY_CLOUD_NAME","qa-cloud");
  expect(()=>assertTenantCloudinaryAsset({...asset,url:"https://res.cloudinary.com/qa-cloud/image/upload/v123/manecomb/tenant-a/document/receipt.pdf"})).toThrow("INVALID_STORAGE_DELIVERY");
  expect(()=>assertTenantCloudinaryAsset({...asset,url:"https://res.cloudinary.com/qa-cloud/image/authenticated/v123/manecomb/tenant-a/document/receipt.pdf"})).not.toThrow();
});
it("accepts the matching versioned asset and rejects transformation/traversal ambiguity", () => {
  vi.stubEnv("CLOUDINARY_CLOUD_NAME", "qa-cloud");
  expect(() => assertTenantCloudinaryAsset({ ...asset, url: "https://res.cloudinary.com/qa-cloud/image/authenticated/v123/manecomb/tenant-a/document/receipt.pdf" })).not.toThrow();
  expect(() => assertTenantCloudinaryAsset({ ...asset, url: "https://res.cloudinary.com/qa-cloud/image/upload/manecomb/tenant-a/document/receipt.pdf/another" })).toThrow();
});
