export type UploadKind = "document" | "chat";

export const UPLOAD_POLICY = {
  document: {
    maxBytes: 15 * 1024 * 1024,
    mimeTypes: ["image/jpeg", "image/png", "image/webp", "application/pdf"] as const,
    formats: ["jpg", "jpeg", "png", "webp", "pdf"] as const
  },
  chat: {
    maxBytes: 8 * 1024 * 1024,
    mimeTypes: ["image/jpeg", "image/png", "image/webp"] as const,
    formats: ["jpg", "jpeg", "png", "webp"] as const
  }
} as const;

export function sanitizeStorageSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "");
}

export function managedUploadFolder(organizationId: string, kind: UploadKind) {
  return "manecomb/" + sanitizeStorageSegment(organizationId) + "/" + kind;
}
