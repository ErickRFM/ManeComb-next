export type NativeServerTarget={
  url:string;
  appStartPath:string;
};

export function nativeServerTarget(value:string|undefined):NativeServerTarget|undefined{
  if(!value)return undefined;
  const parsed=new URL(value);
  const appStartPath=parsed.pathname==="/" ? "/app" : parsed.pathname;
  parsed.pathname="/";
  parsed.search="";
  parsed.hash="";
  return {url:parsed.origin,appStartPath};
}

export function nativeServerUrl(value:string|undefined):string|undefined{
  const target=nativeServerTarget(value);
  if(!target)return undefined;
  return target.url+target.appStartPath;
}
