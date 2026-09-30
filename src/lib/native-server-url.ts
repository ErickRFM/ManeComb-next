export function nativeServerUrl(value:string|undefined):string|undefined{
  if(!value)return undefined;
  const url=new URL(value);
  if(url.pathname==="/")url.pathname="/app";
  return url.toString();
}
