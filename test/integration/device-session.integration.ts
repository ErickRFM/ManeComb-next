import mongoose from "mongoose";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, expect, it } from "vitest";
import { connectDb } from "@/src/lib/db";
import { requireDeviceTelemetrySession, hashDeviceToken } from "@/src/lib/device-session";
import { DeviceSession } from "@/src/core/models/DeviceSession";
import { Organization } from "@/src/core/models/Organization";
import { User } from "@/src/core/models/User";
import { Vehicle } from "@/src/core/models/Vehicle";
import { Journey } from "@/src/core/models/Journey";
import { requireIntegrationDatabase } from "../support/integration-database";
import {createSessionForUser,requireApiSession} from "@/src/lib/auth";
import {POST as logout} from "@/app/api/auth/logout/route";
let ownedDatabase="";let user:any;let vehicle:any;let journey:any;let token="";let stored:any;
beforeAll(async()=>{
  const database=requireIntegrationDatabase(process.env.MONGODB_URI);await connectDb();
  if(mongoose.connection.name!==database)throw new Error("Device QA database mismatch");
  ownedDatabase=database;await Promise.all(Object.values(mongoose.models).map(model=>model.init()));
});
beforeEach(async()=>{
  const org=await Organization.create({name:"Device QA",slug:randomUUID()});
  user=await User.create({organizationId:org._id,name:"Driver",email:randomUUID()+"@example.invalid",passwordHash:"x",roles:["driver"],channel:"mobile_operations"});
  vehicle=await Vehicle.create({organizationId:org._id,economicNumber:randomUUID(),driverId:user._id,status:"running"});
  journey=await Journey.create({organizationId:org._id,driverId:user._id,vehicleId:vehicle._id,state:"RUNNING"});
  token="mcdev_qa_"+randomUUID();
  stored=await DeviceSession.create({organizationId:org._id,userId:user._id,vehicleId:vehicle._id,journeyId:journey._id,tokenHash:hashDeviceToken(token),expiresAt:new Date(Date.now()+60_000)});
});
afterAll(async()=>{if(ownedDatabase&&mongoose.connection.name===ownedDatabase)await mongoose.connection.db?.dropDatabase();await mongoose.disconnect()});
const request=()=>new Request("http://localhost/api/locations/telemetry",{headers:{authorization:"Bearer "+token}});
it("accepts only the bound running journey/driver/vehicle",async()=>{
  const session=await requireDeviceTelemetrySession(request());
  expect(session.journeyId).toBe(String(journey._id));expect(session.vehicleId).toBe(String(vehicle._id));
});
it.each(["disabled","assignment","closed"])("revokes telemetry credentials after %s",async(reason)=>{
  if(reason==="disabled")await User.updateOne({_id:user._id},{$set:{active:false}});
  if(reason==="assignment")await Vehicle.updateOne({_id:vehicle._id},{$unset:{driverId:1}});
  if(reason==="closed")await Journey.updateOne({_id:journey._id},{$set:{state:"FINISHED"}});
  await expect(requireDeviceTelemetrySession(request())).rejects.toThrow("UNAUTHORIZED");
  expect((await DeviceSession.findById(stored._id))!.revokedAt).toBeInstanceOf(Date);
});
it("rejects an expired credential",async()=>{
  await DeviceSession.updateOne({_id:stored._id},{$set:{expiresAt:new Date(Date.now()-1000)}});
  await expect(requireDeviceTelemetrySession(request())).rejects.toThrow("UNAUTHORIZED");
});
it("explicit mobile logout revokes its web session and native telemetry credentials",async()=>{
  const session=await createSessionForUser(user);
  const signed=new Request("http://localhost/api/auth/logout",{method:"POST",headers:{authorization:"Bearer "+session.token}});
  expect((await logout(signed)).status).toBe(200);
  await expect(requireDeviceTelemetrySession(request())).rejects.toThrow("UNAUTHORIZED");
  await expect(requireApiSession(signed)).rejects.toThrow("UNAUTHORIZED");
});
