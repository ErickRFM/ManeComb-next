import { beforeEach, expect, it, vi } from "vitest";
const redis=vi.hoisted(()=>({connect:vi.fn(),set:vi.fn(),eval:vi.fn(),disconnect:vi.fn(),duplicate:vi.fn(),on:vi.fn()}));
vi.mock("@/src/lib/redis",()=>({ensureRedis:async()=>redis,getRedis:()=>redis}));
import { withVehicleCapacityLock } from "@/src/core/services/vehicle-capacity-lock";
beforeEach(()=>{
  vi.clearAllMocks();
  redis.duplicate.mockReturnValue(redis);
  redis.connect.mockResolvedValue(undefined);
  redis.set.mockResolvedValue("OK");
  redis.eval.mockRejectedValue(new Error("Redis unavailable during release"));
});
it("preserves a successful write when lock release fails",async()=>{
  await expect(withVehicleCapacityLock("tenant",async()=>({id:"vehicle"}))).resolves.toEqual({id:"vehicle"});
});
it("preserves the original operation error when lock release also fails",async()=>{
  await expect(withVehicleCapacityLock("tenant",async()=>{throw new Error("VEHICLE_LIMIT_REACHED")})).rejects.toThrow("VEHICLE_LIMIT_REACHED");
});
