import { describe, expect, it } from "vitest";
import { getMetricsSnapshot, incrementMetric, observeDuration } from "@/src/lib/metrics";

describe("bounded metrics",()=>{
  it("drops high-cardinality identifiers from tags",()=>{
    const name="test_metric_cardinality";
    incrementMetric(name,1,{status:"ok",userId:"u1",vehicleId:"v1",organizationId:"o1"});
    incrementMetric(name,1,{status:"ok",userId:"u2",vehicleId:"v2",organizationId:"o2"});
    const rows=getMetricsSnapshot().counters.filter(item=>item.name===name);
    expect(rows).toHaveLength(1);
    expect(rows[0].value).toBe(2);
    expect(rows[0].tags).toEqual({status:"ok"});
  });

  it("tracks approximate timer percentiles without storing samples",()=>{
    const name="test_timer_buckets";
    observeDuration(name,10);
    observeDuration(name,100);
    observeDuration(name,1000);
    const timer=getMetricsSnapshot().timers.find(item=>item.name===name);
    expect(timer?.count).toBe(3);
    expect(timer?.p95ApproxMs).toBeGreaterThanOrEqual(1000);
    expect(timer?.percentileMethod).toContain("bucket");
  });
});
