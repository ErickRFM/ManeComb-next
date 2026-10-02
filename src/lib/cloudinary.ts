import { createHash } from "node:crypto";
import { getEnv } from "@/src/lib/env";
import { UPLOAD_POLICY } from "@/src/core/domain/upload-policy";

export type ManeCombUploadKind="document"|"chat"|"payment"|"incident";

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

type TenantAssetInput={organizationId:string;kind:ManeCombUploadKind;url:string;publicId:string;resourceType?:string};

export function assertTenantCloudinaryAsset(input:TenantAssetInput,options:{allowLegacyPublic?:boolean}={}){
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

export async function verifyTenantCloudinaryAsset(input:TenantAssetInput&{bytes:number;mimeType?:string}){
  const asset=assertTenantCloudinaryAsset(input);
  const env=getEnv();
  if(!env.cloudinaryApiKey||!env.cloudinaryApiSecret)throw new Error("Cloudinary is not configured");
  const endpoint="https://api.cloudinary.com/v1_1/"+encodeURIComponent(env.cloudinaryCloudName!)+"/resources/"+asset.resourceType+"/authenticated/"+encodeURIComponent(input.publicId);
  const response=await fetch(endpoint,{headers:{authorization:"Basic "+Buffer.from(env.cloudinaryApiKey+":"+env.cloudinaryApiSecret).toString("base64")},redirect:"error",cache:"no-store",signal:AbortSignal.timeout(10_000)});
  if(!response.ok)throw new Error("STORAGE_VERIFICATION_FAILED");
  const metadata=await response.json();
  const version=asset.directives.match(/^v(\d+)\//)?.[1];
  if(metadata.public_id!==input.publicId||metadata.resource_type!==asset.resourceType||metadata.type!=="authenticated"||(version&&Number(metadata.version)!==Number(version)))throw new Error("INVALID_STORAGE_ASSET");
  if(!Number.isSafeInteger(metadata.bytes)||metadata.bytes<1||metadata.bytes>UPLOAD_POLICY[input.kind].maxBytes||metadata.bytes!==input.bytes)throw new Error("INVALID_STORAGE_SIZE");
  const format=String(metadata.format||input.publicId.split(".").at(-1)||"").toLowerCase();
  if(!(UPLOAD_POLICY[input.kind].formats as readonly string[]).includes(format))throw new Error("INVALID_STORAGE_FORMAT");
  const mimeTypes:Record<string,string>={jpg:"image/jpeg",jpeg:"image/jpeg",png:"image/png",webp:"image/webp",pdf:"application/pdf",mp4:"video/mp4"};
  const mimeType=mimeTypes[format];
  if(input.mimeType&&input.mimeType!==mimeType)throw new Error("INVALID_STORAGE_MIME");
  return {bytes:metadata.bytes as number,mimeType};
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
