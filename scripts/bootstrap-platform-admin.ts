import { hash } from "bcryptjs";
import { connectDb } from "@/src/lib/db";
import { User } from "@/src/core/models/User";

const email=process.env.PLATFORM_ADMIN_EMAIL?.trim().toLowerCase();
const password=process.env.PLATFORM_ADMIN_PASSWORD;
const name=process.env.PLATFORM_ADMIN_NAME?.trim()||"Administrador ManeComb";
if(!email||!password||password.length<12) throw new Error("Set PLATFORM_ADMIN_EMAIL and PLATFORM_ADMIN_PASSWORD (12+ chars)");

await connectDb();
const passwordHash=await hash(password,12);
const user=await User.findOneAndUpdate(
  {email},
  {$set:{name,passwordHash,organizationId:null,roles:["owner","admin"],channel:"platform_admin",active:true}},
  {upsert:true,new:true,setDefaultsOnInsert:true}
);
console.log("Platform admin ready:",user.email,String(user._id));
process.exit(0);
