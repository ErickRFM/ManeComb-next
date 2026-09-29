import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDb } from "@/src/lib/db";
import { CommercialLead } from "@/src/core/models/CommercialLead";
const Input=z.object({name:z.string().min(2).max(120),email:z.string().email(),phone:z.string().max(40).optional(),fleetSize:z.number().int().min(1).max(10000).optional(),message:z.string().max(2000).optional()});
export const runtime="nodejs";
export async function POST(request:Request){
  try{const input=Input.parse(await request.json());await connectDb();const lead=await CommercialLead.create(input);return NextResponse.json({id:String(lead._id)},{status:201})}
  catch(error){return NextResponse.json({error:error instanceof Error?error.message:"INVALID_LEAD"},{status:400})}
}
