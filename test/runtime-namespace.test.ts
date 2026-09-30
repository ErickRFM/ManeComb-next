import { afterEach, describe, expect, it } from "vitest";
import { communicationQueueName, getRuntimeNamespace, redisKey, socketAdapterKey } from "@/src/lib/runtime-namespace";

const previous=process.env.REDIS_NAMESPACE;

afterEach(()=>{
  if(previous===undefined)delete process.env.REDIS_NAMESPACE;
  else process.env.REDIS_NAMESPACE=previous;
});

describe("runtime namespace",()=>{
  it("defaults ManeComb Next away from legacy Redis keys",()=>{
    delete process.env.REDIS_NAMESPACE;
    expect(getRuntimeNamespace()).toBe("manecomb-next");
    expect(communicationQueueName()).toBe("manecomb-next:communication");
    expect(socketAdapterKey()).toBe("manecomb-next:socket.io");
  });

  it("sanitizes a deployment-specific namespace",()=>{
    process.env.REDIS_NAMESPACE="manecomb next/prod";
    expect(getRuntimeNamespace()).toBe("manecomb-next-prod");
    expect(redisKey("rate","login")).toBe("manecomb-next-prod:rate:login");
  });
});
