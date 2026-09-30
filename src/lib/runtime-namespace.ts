const DEFAULT_NAMESPACE = "manecomb-next";

export function getRuntimeNamespace() {
  return process.env.REDIS_NAMESPACE?.trim().replace(/[^a-zA-Z0-9:_-]/g, "-") || DEFAULT_NAMESPACE;
}

export function redisKey(...parts: string[]) {
  return [getRuntimeNamespace(), ...parts].join(":");
}

// BullMQ forbids ':' in names; environment isolation belongs in its key prefix.
export function communicationQueueName() { return "communication"; }
export function communicationQueuePrefix() { return redisKey("bull"); }
export function socketAdapterKey() { return redisKey("socket.io"); }
