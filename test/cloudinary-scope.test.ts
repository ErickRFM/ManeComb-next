import { afterEach, expect, it, vi } from "vitest";
import { assertTenantCloudinaryAsset } from "@/src/lib/cloudinary";
afterEach(() => vi.unstubAllEnvs());
const asset = { organizationId: "tenant-a", kind: "document" as const, publicId: "manecomb/tenant-a/document/receipt" };
it("rejects a same-cloud URL for a different tenant than the supplied public ID", () => {
  vi.stubEnv("CLOUDINARY_CLOUD_NAME", "qa-cloud");
  expect(() => assertTenantCloudinaryAsset({ ...asset, url: "https://res.cloudinary.com/qa-cloud/image/upload/v123/manecomb/tenant-b/document/receipt.pdf" })).toThrow("INVALID_STORAGE_ASSET");
});
it("accepts the matching versioned asset and rejects transformation/traversal ambiguity", () => {
  vi.stubEnv("CLOUDINARY_CLOUD_NAME", "qa-cloud");
  expect(() => assertTenantCloudinaryAsset({ ...asset, url: "https://res.cloudinary.com/qa-cloud/image/upload/v123/manecomb/tenant-a/document/receipt.pdf" })).not.toThrow();
  expect(() => assertTenantCloudinaryAsset({ ...asset, url: "https://res.cloudinary.com/qa-cloud/image/upload/manecomb/tenant-a/document/receipt.pdf/another" })).toThrow();
});
