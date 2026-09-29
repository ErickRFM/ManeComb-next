"use client";

import { UPLOAD_POLICY, type UploadKind } from "@/src/core/domain/upload-policy";

export async function uploadManeCombFile(file: File, kind: UploadKind) {
  const policy = UPLOAD_POLICY[kind];
  if (file.size <= 0 || file.size > policy.maxBytes) {
    throw new Error("El archivo excede el tamaño permitido");
  }
  if (!(policy.mimeTypes as readonly string[]).includes(file.type)) {
    throw new Error("Tipo de archivo no permitido");
  }

  const signatureResponse = await fetch("/api/uploads/cloudinary/signature", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ kind })
  });
  const signature = await signatureResponse.json();
  if (!signatureResponse.ok) throw new Error(signature.error || "No se pudo preparar la carga");

  const form = new FormData();
  form.set("file", file);
  form.set("api_key", signature.apiKey);
  form.set("timestamp", String(signature.timestamp));
  form.set("folder", signature.folder);
  form.set("allowed_formats", signature.allowedFormats.join(","));
  form.set("signature", signature.signature);

  const uploadResponse = await fetch(
    "https://api.cloudinary.com/v1_1/" + encodeURIComponent(signature.cloudName) + "/auto/upload",
    { method: "POST", body: form }
  );
  const uploaded = await uploadResponse.json();
  if (!uploadResponse.ok) throw new Error(uploaded?.error?.message || "Cloudinary rechazó el archivo");

  const bytes = Number(uploaded.bytes || file.size);
  if (bytes > policy.maxBytes) throw new Error("El archivo cargado excede el tamaño permitido");

  return {
    url: uploaded.secure_url as string,
    publicId: uploaded.public_id as string,
    resourceType: uploaded.resource_type as string,
    bytes,
    mimeType: file.type,
    fileName: file.name
  };
}
