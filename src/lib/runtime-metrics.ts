import { monitorEventLoopDelay, performance } from "node:perf_hooks";
import { setGauge } from "@/src/lib/metrics";

export function startRuntimeMetrics(){
  const delay=monitorEventLoopDelay({resolution:20});delay.enable();
  let cpu=process.cpuUsage();let elapsed=performance.now();let loop=performance.eventLoopUtilization();
  const timer=setInterval(()=>{
    const now=performance.now();const used=process.cpuUsage(cpu);cpu=process.cpuUsage();
    const utilization=performance.eventLoopUtilization(loop);loop=performance.eventLoopUtilization();
    setGauge("process_cpu_percent",100*(used.user+used.system)/1000/(now-elapsed));elapsed=now;
    setGauge("process_rss_bytes",process.memoryUsage().rss);
    setGauge("process_heap_used_bytes",process.memoryUsage().heapUsed);
    setGauge("event_loop_utilization",utilization.utilization);
    setGauge("event_loop_delay_p95_ms",delay.percentile(95)/1e6);delay.reset();
  },5000);timer.unref();
  return ()=>{clearInterval(timer);delay.disable()};
}
