import { NextResponse } from "next/server";
import { requireApiSession } from "@/src/lib/auth";
import { apiError } from "@/src/lib/http";
import { assertPlatformPermission } from "@/src/core/platform/permissions";
import { getMetricsSnapshot } from "@/src/lib/metrics";
import { getCommunicationQueue } from "@/src/lib/queue";
import { OutboxEvent } from "@/src/core/models/OutboxEvent";

export const runtime="nodejs";

export async function GET(request:Request){
  try{
    const session=await requireApiSession(request,["platform_admin"]);
    assertPlatformPermission(session,"platform.system.read");
    const metrics=getMetricsSnapshot();
    const queue=await getCommunicationQueue();
    const queueCounts=await queue.getJobCounts("waiting","active","delayed","failed","completed","paused");
    const [outboxCounts,oldest]=await Promise.all([
      OutboxEvent.aggregate([{$group:{_id:"$status",count:{$sum:1}}}]),
      OutboxEvent.findOne({status:{$in:["pending","queued","failed"]}}).select("createdAt").sort({createdAt:1}).lean()
    ]);
    const requests=metrics.counters.find(item=>item.name==="api_requests_total")?.value||0;
    const errors=metrics.counters.filter(item=>item.name==="api_errors_total").reduce((sum,item)=>sum+item.value,0);
    return NextResponse.json({
      metrics,
      summary:{
        apiRequests:requests,
        apiErrors:errors,
        apiErrorRatePercent:requests?Math.round(errors/requests*10_000)/100:0,
        socketsConnected:metrics.gauges.find(item=>item.name==="socket_connections")?.value||0,
        queue:queueCounts,
        outbox:{counts:Object.fromEntries(outboxCounts.map((row:any)=>[row._id,row.count])),oldestUnprocessedAgeMs:oldest?Math.max(0,Date.now()-new Date((oldest as any).createdAt).getTime()):null}
      }
    });
  }catch(error){return apiError(error)}
}
