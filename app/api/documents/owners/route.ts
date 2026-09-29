import { NextResponse } from "next/server";
import { requireApiSession } from "@/src/lib/auth";
import { assertPermission } from "@/src/lib/authorization";
import { connectDb } from "@/src/lib/db";
import { apiError } from "@/src/lib/http";
import { User } from "@/src/core/models/User";
import { Vehicle } from "@/src/core/models/Vehicle";

export const runtime="nodejs";

export async function GET(request:Request){
  try{
    const session=assertPermission(await requireApiSession(request,["company_portal"]),"manage_documents");
    if(!session.organizationId)throw new Error("FORBIDDEN");
    await connectDb();
    const [drivers,vehicles]=await Promise.all([
      User.find({organizationId:session.organizationId,channel:"mobile_operations"}).select("_id name active").sort({name:1}).lean(),
      Vehicle.find({organizationId:session.organizationId,status:{$ne:"archived"}}).select("_id economicNumber plates").sort({economicNumber:1}).lean()
    ]);
    return NextResponse.json({drivers,vehicles});
  }catch(error){return apiError(error)}
}
