import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiSession } from "@/src/lib/auth";
import { connectDb } from "@/src/lib/db";
import { apiError } from "@/src/lib/http";
import { assertPlatformPermission } from "@/src/core/platform/permissions";
import { Subscription } from "@/src/core/models/Subscription";

const Query=z.object({
  page:z.coerce.number().int().min(1).default(1),
  limit:z.coerce.number().int().min(1).max(100).default(30),
  search:z.string().trim().max(120).default(""),
  status:z.enum(["trial","active","past_due","paused","cancelled"]).optional(),
  provider:z.enum(["mercadopago","manual"]).optional()
});
const escapeRegex=(value:string)=>value.replace(/[\\^$.*+?()[\]{}|]/g,"\\$&");

export const runtime="nodejs";

export async function GET(request:Request){
  try{
    const session=await requireApiSession(request,["platform_admin"]);
    assertPlatformPermission(session,"platform.billing.read");
    const url=new URL(request.url);
    const query=Query.parse({
      page:url.searchParams.get("page")||undefined,
      limit:url.searchParams.get("limit")||undefined,
      search:url.searchParams.get("search")||"",
      status:url.searchParams.get("status")||undefined,
      provider:url.searchParams.get("provider")||undefined
    });
    await connectDb();

    const match:any={};
    if(query.status)match.status=query.status;
    if(query.provider)match.provider=query.provider;

    const pipeline:any[]=[
      {$match:match},
      {$lookup:{from:"organizations",localField:"organizationId",foreignField:"_id",as:"organization"}},
      {$unwind:{path:"$organization",preserveNullAndEmptyArrays:true}}
    ];
    if(query.search){
      const pattern=new RegExp(escapeRegex(query.search),"i");
      pipeline.push({$match:{$or:[
        {"organization.name":pattern},
        {"organization.slug":pattern},
        {planCode:pattern},
        {provider:pattern},
        {status:pattern}
      ]}});
    }
    pipeline.push(
      {$sort:{updatedAt:-1,_id:-1}},
      {$facet:{
        items:[
          {$skip:(query.page-1)*query.limit},
          {$limit:query.limit},
          {$project:{
            organizationId:1,planCode:1,status:1,provider:1,vehicleLimit:1,
            currentPeriodEnd:1,nextPaymentAt:1,lastPaymentAt:1,reconciliationNeeded:1,
            updatedAt:1,
            organization:{_id:"$organization._id",name:"$organization.name",slug:"$organization.slug",status:"$organization.status"}
          }}
        ],
        meta:[{$count:"total"}]
      }}
    );

    const [result]=await Subscription.aggregate(pipeline);
    const total=Number(result?.meta?.[0]?.total||0);
    return NextResponse.json({
      subscriptions:result?.items||[],
      pageInfo:{
        page:query.page,limit:query.limit,total,
        totalPages:Math.max(1,Math.ceil(total/query.limit)),
        hasPrev:query.page>1,
        hasNext:query.page*query.limit<total
      }
    });
  }catch(error){return apiError(error)}
}
