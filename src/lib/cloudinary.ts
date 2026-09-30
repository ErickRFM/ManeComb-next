import { createHash } from "node:crypto";
import { getEnv } from "@/src/lib/env";
import { UPLOAD_POLICY } from "@/src/core/domain/upload-policy";

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
  const allowedFormats=UPLOAD_POLICY[input.kind].formats.join(",");
  const type="authenticated";
  const paramsToSign = "allowed_formats="+allowedFormats+"&folder=" + folder + "&timestamp=" + timestamp+"&type="+type;
  const signature = createHash("sha1")
    .update(paramsToSign + env.cloudinaryApiSecret)
    .digest("hex");

  return {
    cloudName: env.cloudinaryCloudName,
    apiKey: env.cloudinaryApiKey,
    timestamp,
    folder,
    allowedFormats,
    type,
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
  resourceType?:string;
},options:{allowLegacyPublic?:boolean}={}){
  const env=getEnv();
  if(!env.cloudinaryCloudName)throw new Error("Cloudinary is not configured");
  const expectedPrefix=expectedCloudinaryFolder(input.organizationId,input.kind)+"/";
  if(!input.publicId.startsWith(expectedPrefix))throw new Error("INVALID_STORAGE_SCOPE");

  const url=new URL(input.url);
  if(url.protocol!=="https:"||url.hostname!=="res.cloudinary.com")throw new Error("INVALID_STORAGE_URL");
  const cloudPrefix="/"+encodeURIComponent(env.cloudinaryCloudName)+"/";
  if(!url.pathname.startsWith(cloudPrefix))throw new Error("INVALID_STORAGE_CLOUD");
  const assetPath=decodeURIComponent(url.pathname.slice(cloudPrefix.length));
  const delivery=assetPath.match(/^(image|raw|video)\/(upload|authenticated)\/(?:s--[A-Za-z0-9_-]{8}--\/)?((?:v\d+\/)?(.+))$/);
  const storedPath=delivery?.[4];
  const matches=storedPath===input.publicId || Boolean(storedPath?.startsWith(input.publicId+".") && /^[A-Za-z0-9]+$/.test(storedPath.slice(input.publicId.length+1)));
  if(!matches || input.publicId.split("/").some(part=>part==="."||part==="..") || url.search || url.hash)throw new Error("INVALID_STORAGE_ASSET");
  if(delivery![2]!=="authenticated"&&!options.allowLegacyPublic)throw new Error("INVALID_STORAGE_DELIVERY");
  if(input.resourceType&&input.resourceType!==delivery![1])throw new Error("INVALID_STORAGE_RESOURCE_TYPE");
  const extension=storedPath!.split(".").at(-1)!.toLowerCase();
  if(!(UPLOAD_POLICY[input.kind].formats as readonly string[]).includes(extension))throw new Error("INVALID_STORAGE_FORMAT");
  return {url,resourceType:delivery![1],deliveryType:delivery![2],directives:delivery![3]};
}

export async function proxyTrustedCloudinaryAsset(urlValue:string,scope:{organizationId:string;kind:ManeCombUploadKind;publicId:string;resourceType?:string}){
  const env=getEnv();
  const {url,resourceType,deliveryType,directives}=assertTenantCloudinaryAsset({...scope,url:urlValue},{allowLegacyPublic:true});
  if(deliveryType==="authenticated"){
    if(!env.cloudinaryApiSecret)throw new Error("Cloudinary is not configured");
    const signature=createHash("sha1").update(directives+env.cloudinaryApiSecret).digest("base64url").slice(0,8);
    url.pathname="/"+encodeURIComponent(env.cloudinaryCloudName!)+"/"+resourceType+"/authenticated/s--"+signature+"--/"+directives;
  }

  const upstream=await fetch(url,{redirect:"error",cache:"no-store",signal:AbortSignal.timeout(10_000)});
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
