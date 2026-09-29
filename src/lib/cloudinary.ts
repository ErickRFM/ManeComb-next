import { createHash } from "node:crypto";
import { getEnv } from "@/src/lib/env";

export function createCloudinaryUploadSignature(input: {
  organizationId: string;
  kind: "document" | "chat";
}) {
  const env = getEnv();
  if (!env.cloudinaryCloudName || !env.cloudinaryApiKey || !env.cloudinaryApiSecret) {
    throw new Error("Cloudinary is not configured");
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const folder = "manecomb/" + sanitize(input.organizationId) + "/" + input.kind;
  const paramsToSign = "folder=" + folder + "&timestamp=" + timestamp;
  const signature = createHash("sha1")
    .update(paramsToSign + env.cloudinaryApiSecret)
    .digest("hex");

  return {
    cloudName: env.cloudinaryCloudName,
    apiKey: env.cloudinaryApiKey,
    timestamp,
    folder,
    signature
  };
}

function sanitize(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "");
}
