import { createHash } from "node:crypto";
import { getEnv } from "@/src/lib/env";
import { managedUploadFolder, UPLOAD_POLICY, type UploadKind } from "@/src/core/domain/upload-policy";

export function createCloudinaryUploadSignature(input: {
  organizationId: string;
  kind: UploadKind;
}) {
  const env = getEnv();
  if (!env.cloudinaryCloudName || !env.cloudinaryApiKey || !env.cloudinaryApiSecret) {
    throw new Error("Cloudinary is not configured");
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const folder = managedUploadFolder(input.organizationId, input.kind);
  const policy = UPLOAD_POLICY[input.kind];
  const allowedFormats = [...policy.formats];
  const params = {
    allowed_formats: allowedFormats.join(","),
    folder,
    timestamp: String(timestamp)
  };
  const paramsToSign = Object.entries(params)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => key + "=" + value)
    .join("&");
  const signature = createHash("sha1")
    .update(paramsToSign + env.cloudinaryApiSecret)
    .digest("hex");

  return {
    cloudName: env.cloudinaryCloudName,
    apiKey: env.cloudinaryApiKey,
    timestamp,
    folder,
    signature,
    allowedFormats,
    maxBytes: policy.maxBytes,
    mimeTypes: [...policy.mimeTypes]
  };
}
