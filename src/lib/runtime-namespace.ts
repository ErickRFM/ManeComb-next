const DEFAULT_NAMESPACE="manecomb-next";

export function getRuntimeNamespace(){
  const value=String(process.env.REDIS_NAMESPACE||DEFAULT_NAMESPACE).trim();
  const safe=value.replace(/[^a-zA-Z0-9:_-]/g,"-").replace(/-+/g,"-");
  return safe||DEFAULT_NAMESPACE;
}

export function redisKey(...parts:Array<string|number>){
  return [getRuntimeNamespace(),...parts.map(part=>String(part))].join(":");
}

export function communicationQueueName(){
  return redisKey("communication");
}

export function socketAdapterKey(){
  return redisKey("socket.io");
}
