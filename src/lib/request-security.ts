type MutationRequestSecurityInput={
  method:string;
  pathname:string;
  origin:string|null;
  secFetchSite:string|null;
  authorization:string|null;
  hasSessionCookie:boolean;
  hasMfaCookie:boolean;
  appUrl:string|undefined;
  requestOrigin:string;
};

const SAFE_METHODS=new Set(["GET","HEAD","OPTIONS"]);
const EXEMPT_PATHS=new Set(["/api/webhooks/mercadopago"]);

function expectedOrigin(appUrl:string|undefined,requestOrigin:string){
  try{return new URL(appUrl||requestOrigin).origin}catch{return requestOrigin}
}

export function isTrustedMutationRequest(input:MutationRequestSecurityInput){
  if(SAFE_METHODS.has(input.method.toUpperCase()))return true;
  if(EXEMPT_PATHS.has(input.pathname))return true;
  if(input.authorization?.startsWith("Bearer "))return true;

  const cookieAuthenticated=input.hasSessionCookie||input.hasMfaCookie;
  if(!cookieAuthenticated)return true;

  const expected=expectedOrigin(input.appUrl,input.requestOrigin);
  if(input.origin){
    try{return new URL(input.origin).origin===expected}catch{return false}
  }

  return input.secFetchSite==="same-origin";
}
