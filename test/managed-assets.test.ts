import { afterEach, describe, expect, it } from "vitest";
import { assertManagedAssetReference } from "@/src/lib/managed-assets";

const originalCloudName = process.env.CLOUDINARY_CLOUD_NAME;

afterEach(() => {
  if (originalCloudName === undefined) delete process.env.CLOUDINARY_CLOUD_NAME;
  else process.env.CLOUDINARY_CLOUD_NAME = originalCloudName;
});

describe("managed assets", () => {
  it("accepts an asset scoped to the organization and kind", () => {
    process.env.CLOUDINARY_CLOUD_NAME = "manecomb-test";
    expect(() => assertManagedAssetReference({
      organizationId: "org_123",
      kind: "chat",
      url: "https://res.cloudinary.com/manecomb-test/image/upload/v1/manecomb/org_123/chat/photo.webp",
      publicId: "manecomb/org_123/chat/photo",
      bytes: 1024,
      mimeType: "image/webp"
    })).not.toThrow();
  });

  it("rejects cross-tenant public IDs", () => {
    process.env.CLOUDINARY_CLOUD_NAME = "manecomb-test";
    expect(() => assertManagedAssetReference({
      organizationId: "org_123",
      kind: "document",
      url: "https://res.cloudinary.com/manecomb-test/image/upload/v1/manecomb/other/document/file.pdf",
      publicId: "manecomb/other/document/file",
      bytes: 1024,
      mimeType: "application/pdf"
    })).toThrow(/namespace/);
  });

  it("rejects oversized chat assets", () => {
    process.env.CLOUDINARY_CLOUD_NAME = "manecomb-test";
    expect(() => assertManagedAssetReference({
      organizationId: "org_123",
      kind: "chat",
      url: "https://res.cloudinary.com/manecomb-test/image/upload/v1/manecomb/org_123/chat/photo.webp",
      publicId: "manecomb/org_123/chat/photo",
      bytes: 9 * 1024 * 1024,
      mimeType: "image/webp"
    })).toThrow(/size/);
  });
});
