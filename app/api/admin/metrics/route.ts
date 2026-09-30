import { NextResponse } from "next/server";
import { requireApiSession } from "@/src/lib/auth";
import { apiError } from "@/src/lib/http";
import { getMetricsSnapshot } from "@/src/lib/metrics";
import { getCommunicationQueue } from "@/src/lib/queue";

export const runtime="nodejs";

export async function GET(request:Request){
  try{
    await requireApiSession(request,["platform_admin"]);
    const metrics=getMetricsSnapshot();
    const queue=await getCommunicationQueue();
    const queueCounts=await queue.getJobCounts("waiting","active","delayed","failed","completed","paused");
    const requests=metrics.counters.find(item=>item.name==="api_requests_total")?.value||0;
    const errors=metrics.counters.filter(item=>item.name==="api_errors_total").reduce((sum,item)=>sum+item.value,0);
    return NextResponse.json({
      metrics,
      summary:{
        apiRequests:requests,
        apiErrors:errors,
        apiErrorRatePercent:requests?Math.round(errors/requests*10_000)/100:0,
        socketsConnected:metrics.gauges.find(item=>item.name==="socket_connections")?.value||0,
        queue:queueCounts
      }
    });
  }catch(error){return apiError(error)}
}
