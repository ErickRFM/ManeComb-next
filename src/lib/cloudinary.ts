import { createHash } from "node:crypto";
import { getEnv } from "@/src/lib/env";

export type ManeCombUploadKind="document"|"chat"|"payment";

export function createCloudinaryUploadSignature(input: {
  organizationId: string;
  kind: ManeCombUploadKind;
}) {
  const env = getEnv();
  if (!env.cloudinaryCloudName || !env.cloudinaryApiKey || !env.cloudinaryApiSecret) {
    throw new Error("Cloudinary is not configured");
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const folder = expectedCloudinaryFolder(input.organizationId,input.kind);
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

export function expectedCloudinaryFolder(organizationId:string,kind:ManeCombUploadKind){
  return "manecomb/" + sanitize(organizationId) + "/" + kind;
}

export function assertTenantCloudinaryAsset(input:{
  organizationId:string;
  kind:ManeCombUploadKind;
  url:string;
  publicId:string;
}){
  const env=getEnv();
  if(!env.cloudinaryCloudName)throw new Error("Cloudinary is not configured");
  const expectedPrefix=expectedCloudinaryFolder(input.organizationId,input.kind)+"/";
  if(!input.publicId.startsWith(expectedPrefix))throw new Error("INVALID_STORAGE_SCOPE");

  const url=new URL(input.url);
  if(url.protocol!=="https:"||url.hostname!=="res.cloudinary.com")throw new Error("INVALID_STORAGE_URL");
  const cloudPrefix="/"+encodeURIComponent(env.cloudinaryCloudName)+"/";
  if(!url.pathname.startsWith(cloudPrefix))throw new Error("INVALID_STORAGE_CLOUD");
  const assetPath=decodeURIComponent(url.pathname.slice(cloudPrefix.length));
  const delivery=assetPath.match(/^(image|raw|video)\/upload\/(?:v\d+\/)?(.+)$/);
  const storedPath=delivery?.[2];
  const matches=storedPath===input.publicId || Boolean(storedPath?.startsWith(input.publicId+".") && /^[A-Za-z0-9]+$/.test(storedPath.slice(input.publicId.length+1)));
  if(!matches || input.publicId.split("/").some(part=>part==="."||part==="..") || url.search || url.hash)throw new Error("INVALID_STORAGE_ASSET");
}

export async function proxyTrustedCloudinaryAsset(urlValue:string){
  const env=getEnv();
  if(!env.cloudinaryCloudName)throw new Error("Cloudinary is not configured");
  const url=new URL(urlValue);
  if(url.protocol!=="https:"||url.hostname!=="res.cloudinary.com")throw new Error("INVALID_STORAGE_URL");
  const cloudPrefix="/"+encodeURIComponent(env.cloudinaryCloudName)+"/";
  if(!url.pathname.startsWith(cloudPrefix))throw new Error("INVALID_STORAGE_CLOUD");

  const upstream=await fetch(url,{redirect:"error",cache:"no-store"});
  if(!upstream.ok||!upstream.body)throw new Error("STORAGE_DOWNLOAD_FAILED");

  const headers=new Headers();
  headers.set("content-type",upstream.headers.get("content-type")||"application/octet-stream");
  const length=upstream.headers.get("content-length");
  if(length)headers.set("content-length",length);
  headers.set("cache-control","private, no-store, max-age=0");
  headers.set("x-content-type-options","nosniff");
  return new Response(upstream.body,{status:200,headers});
}

function sanitize(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "");
}
