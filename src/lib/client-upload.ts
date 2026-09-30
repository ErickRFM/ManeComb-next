"use client";
import type { ManeCombUploadKind } from "@/src/lib/cloudinary";
import { UPLOAD_POLICY } from "@/src/core/domain/upload-policy";

export async function uploadManeCombFile(file: File, kind: ManeCombUploadKind) {
  if(file.size<=0)throw new Error("Archivo vacío");
  if(file.size>UPLOAD_POLICY[kind].maxBytes)throw new Error("El archivo excede el límite permitido");
  if(!(UPLOAD_POLICY[kind].mimeTypes as readonly string[]).includes(file.type))throw new Error("Formato de archivo no permitido");

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
  form.set("signature", signature.signature);
  form.set("allowed_formats",signature.allowedFormats);
  form.set("type",signature.type);

  const uploadResponse = await fetch(
    "https://api.cloudinary.com/v1_1/" + encodeURIComponent(signature.cloudName) + "/auto/upload",
    { method: "POST", body: form }
  );
  const uploaded = await uploadResponse.json();
  if (!uploadResponse.ok) throw new Error(uploaded?.error?.message || "Cloudinary rechazó el archivo");

  return {
    url: String(uploaded.secure_url).replace(/\/s--[A-Za-z0-9_-]{8}--\//,"/"),
    publicId: uploaded.public_id as string,
    resourceType: uploaded.resource_type as string,
    bytes: Number(uploaded.bytes || file.size),
    mimeType:file.type,
    fileName:file.name
  };
}
