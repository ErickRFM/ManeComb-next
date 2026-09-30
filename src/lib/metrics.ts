type Tags=Record<string,string|number|boolean>;
type Counter={name:string;tags:Tags;value:number};
type Gauge={name:string;tags:Tags;value:number};
type Timer={name:string;tags:Tags;count:number;totalMs:number;maxMs:number;buckets:Array<{upperBoundMs:number;count:number}>};

const runtime=globalThis as typeof globalThis & {
  __manecombMetrics?:{
    counters:Record<string,Counter>;
    gauges:Record<string,Gauge>;
    timers:Record<string,Timer>;
  }
};

const store=runtime.__manecombMetrics||(runtime.__manecombMetrics={counters:{},gauges:{},timers:{}});
const BUCKETS=[5,10,25,50,100,250,500,1000,2500,5000,10000,30000,Infinity];
const PROHIBITED=new Set(["packetId","traceId","userId","vehicleId","organizationId","journeyId"]);

function clean(tags:Tags={}){
  return Object.fromEntries(Object.entries(tags).filter(([key])=>!PROHIBITED.has(key))) as Tags;
}
function key(name:string,tags:Tags){
  const tag=Object.keys(tags).sort().map(k=>k+":"+String(tags[k])).join("|");
  return name+(tag?"{"+tag+"}":"");
}
export function incrementMetric(name:string,value=1,tags:Tags={}){
  tags=clean(tags);const k=key(name,tags);
  store.counters[k] ||= {name,tags,value:0};
  store.counters[k].value+=value;
}
export function setGauge(name:string,value:number,tags:Tags={}){
  tags=clean(tags);store.gauges[key(name,tags)]={name,tags,value};
}
export function observeDuration(name:string,durationMs:number,tags:Tags={}){
  tags=clean(tags);const k=key(name,tags);
  store.timers[k] ||= {name,tags,count:0,totalMs:0,maxMs:0,buckets:BUCKETS.map(upperBoundMs=>({upperBoundMs,count:0}))};
  const timer=store.timers[k];
  const safe=Math.max(0,Number(durationMs)||0);
  timer.count+=1;timer.totalMs+=safe;timer.maxMs=Math.max(timer.maxMs,safe);
  const bucket=timer.buckets.find(item=>safe<=item.upperBoundMs);if(bucket)bucket.count+=1;
}
function percentile(timer:Timer,p:number){
  const target=Math.max(1,Math.ceil(timer.count*p));let cumulative=0;
  for(const bucket of timer.buckets){
    cumulative+=bucket.count;
    if(cumulative>=target)return Number.isFinite(bucket.upperBoundMs)?Math.min(bucket.upperBoundMs,timer.maxMs):timer.maxMs;
  }
  return timer.maxMs;
}
export function getMetricsSnapshot(){
  return {
    counters:Object.values(store.counters).map(item=>({...item})),
    gauges:Object.values(store.gauges).map(item=>({...item})),
    timers:Object.values(store.timers).map(timer=>({
      name:timer.name,tags:timer.tags,count:timer.count,totalMs:timer.totalMs,maxMs:timer.maxMs,
      averageMs:timer.count?Math.round(timer.totalMs/timer.count):0,
      p50ApproxMs:percentile(timer,.5),p95ApproxMs:percentile(timer,.95),p99ApproxMs:percentile(timer,.99),
      percentileMethod:"approximate_bucket_upper_bound_process_lifetime"
    })),
    timestamp:new Date().toISOString()
  };
}
export function recordApiRequest(statusCode:number,durationMs:number){
  incrementMetric("api_requests_total");
  if(statusCode>=400)incrementMetric("api_errors_total",1,{statusClass:Math.floor(statusCode/100)+"xx"});
  observeDuration("api_duration_ms",durationMs);
}
