import { getEnv } from "@/src/lib/env";
import { managedUploadFolder, UPLOAD_POLICY, type UploadKind } from "@/src/core/domain/upload-policy";

export function assertManagedAssetReference(input: {
  organizationId: string;
  kind: UploadKind;
  url: string;
  publicId: string;
  bytes?: number;
  mimeType?: string;
}) {
  const env = getEnv();
  if (!env.cloudinaryCloudName) throw new Error("Cloudinary is not configured");

  const policy = UPLOAD_POLICY[input.kind];
  const folder = managedUploadFolder(input.organizationId, input.kind);
  if (!input.publicId.startsWith(folder + "/")) {
    throw new Error("Asset does not belong to the organization storage namespace");
  }

  let url: URL;
  try {
    url = new URL(input.url);
  } catch {
    throw new Error("Invalid managed asset URL");
  }
  if (url.protocol !== "https:" || url.hostname !== "res.cloudinary.com") {
    throw new Error("Asset must use the configured Cloudinary HTTPS endpoint");
  }

  const pathname = decodeURIComponent(url.pathname);
  const segments = pathname.split("/").filter(Boolean);
  if (segments[0] !== env.cloudinaryCloudName || !pathname.includes("/upload/") || !pathname.includes("/" + folder + "/")) {
    throw new Error("Asset URL does not match the configured Cloudinary namespace");
  }

  if (typeof input.bytes === "number" && (input.bytes < 0 || input.bytes > policy.maxBytes)) {
    throw new Error("Asset exceeds the allowed size");
  }
  if (input.mimeType && !(policy.mimeTypes as readonly string[]).includes(input.mimeType)) {
    throw new Error("Asset MIME type is not allowed");
  }
}
