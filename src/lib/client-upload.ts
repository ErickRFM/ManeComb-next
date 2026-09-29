"use client";
import type { ManeCombUploadKind } from "@/src/lib/cloudinary";

const MAX_BYTES:Record<ManeCombUploadKind,number>={
  document:10*1024*1024,
  payment:10*1024*1024,
  chat:8*1024*1024
};

export async function uploadManeCombFile(file: File, kind: ManeCombUploadKind) {
  if(file.size<=0)throw new Error("Archivo vacío");
  if(file.size>MAX_BYTES[kind])throw new Error("El archivo excede el límite permitido");

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

  const uploadResponse = await fetch(
    "https://api.cloudinary.com/v1_1/" + encodeURIComponent(signature.cloudName) + "/auto/upload",
    { method: "POST", body: form }
  );
  const uploaded = await uploadResponse.json();
  if (!uploadResponse.ok) throw new Error(uploaded?.error?.message || "Cloudinary rechazó el archivo");

  return {
    url: uploaded.secure_url as string,
    publicId: uploaded.public_id as string,
    resourceType: uploaded.resource_type as string,
    bytes: Number(uploaded.bytes || file.size)
  };
}
