import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDb } from "@/src/lib/db";
import { apiError } from "@/src/lib/http";
import { enforceRateLimit } from "@/src/lib/rate-limit";
import { CommercialLead } from "@/src/core/models/CommercialLead";
const Input=z.object({name:z.string().min(2).max(120),email:z.string().email(),phone:z.string().max(40).optional(),fleetSize:z.number().int().min(1).max(10000).optional(),message:z.string().max(2000).optional()});
export const runtime="nodejs";
export async function POST(request:Request){
  try{
    const input=Input.parse(await request.json());
    await enforceRateLimit(request,"commercial:lead",{limit:20,windowSeconds:600,identity:input.email});
    await connectDb();
    const lead=await CommercialLead.create(input);
    return NextResponse.json({id:String(lead._id)},{status:201});
  }catch(error){return apiError(error)}
}
