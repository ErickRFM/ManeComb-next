import mongoose from "mongoose";
import { randomUUID } from "node:crypto";
import { afterAll,beforeAll,beforeEach,expect,it } from "vitest";
import { connectDb } from "@/src/lib/db";
import { Organization } from "@/src/core/models/Organization";
import { User } from "@/src/core/models/User";
import { Vehicle } from "@/src/core/models/Vehicle";
import { Journey } from "@/src/core/models/Journey";
import { RouteSessionPosition } from "@/src/core/models/RouteSessionPosition";
import { TelemetrySchema } from "@/src/core/contracts/telemetry";
import { recordTelemetry } from "@/src/core/services/telemetry";
import { requireIntegrationDatabase } from "../support/integration-database";
let db="",org:any,driver:any,vehicle:any,journey:any;
beforeAll(async()=>{db=requireIntegrationDatabase(process.env.MONGODB_URI);await connectDb();if(mongoose.connection.name!==db)throw Error("QA database mismatch");await Promise.all(Object.values(mongoose.models).map(m=>m.init()))});
beforeEach(async()=>{
  org=await Organization.create({name:"Telemetry QA",slug:randomUUID()});
  driver=await User.create({organizationId:org._id,name:"Driver",email:randomUUID()+"@example.invalid",passwordHash:"x",roles:["driver"],channel:"mobile_operations"});
  vehicle=await Vehicle.create({organizationId:org._id,economicNumber:randomUUID(),driverId:driver._id});
  journey=await Journey.create({organizationId:org._id,vehicleId:vehicle._id,driverId:driver._id,state:"RUNNING",startedAt:new Date(Date.now()-3_600_000)});
});
afterAll(async()=>{if(db&&mongoose.connection.name===db)await mongoose.connection.db?.dropDatabase();await mongoose.disconnect()});
const sample=(age=0,extra:Record<string,unknown>={})=>TelemetrySchema.parse({vehicleId:String(vehicle._id),journeyId:String(journey._id),packetId:randomUUID(),latitude:20,longitude:-99,speedMps:4,recordedAt:new Date(Date.now()-age),...extra});
const ingest=(input:ReturnType<typeof sample>)=>recordTelemetry(String(org._id),input,{driverId:String(driver._id)});
it.each([300_000,1_200_000])("stores %s ms backlog without creating live lastLocation",async age=>{
  const input=sample(age);const snapshot=await ingest(input);
  expect(snapshot.latitude).toBeNull();
  const history:any=await RouteSessionPosition.findOne({organizationId:org._id,packetId:input.packetId}).lean();
  expect(history?.latitude).toBe(20);expect(history?.classification).toBe("historical_only");expect(history?.recordedAt).toEqual(input.recordedAt);
  const live=await ingest(sample());expect(live.latitude).toBe(20);expect(live.freshness).toBe("live");
});
it("does not let a future clock poison subsequent live GPS",async()=>{
  await ingest(sample(-600_000,{latitude:21}));const live=await ingest(sample());
  expect(live.latitude).toBe(20);expect(live.freshness).toBe("live");
});
it("persists raw out-of-order history without regressing position",async()=>{
  await ingest(sample());const input=sample(5000,{latitude:19});expect((await ingest(input)).latitude).toBe(20);
  expect((await RouteSessionPosition.findOne({packetId:input.packetId}))?.classification).toBe("out_of_order");
});
it("replay never replaces original packet coordinates or capture evidence",async()=>{
  const input=sample(1000);await ingest(input);
  const replay=await ingest({...input,latitude:21,recordedAt:new Date(Date.now()+600_000)});
  expect(replay.latitude).toBe(20);expect(await RouteSessionPosition.countDocuments({organizationId:org._id,packetId:input.packetId})).toBe(1);
  expect((await RouteSessionPosition.findOne({packetId:input.packetId}))?.recordedAt).toEqual(input.recordedAt);
});
it("maintains packet conflict and tenant isolation",async()=>{
  const input=sample();await ingest(input);
  const other=await Vehicle.create({organizationId:org._id,economicNumber:randomUUID(),driverId:driver._id});
  const running=await Journey.create({organizationId:org._id,vehicleId:other._id,driverId:driver._id,state:"RUNNING"});
  await expect(ingest({...input,vehicleId:String(other._id),journeyId:String(running._id)})).rejects.toThrow("PACKET_ID_CONFLICT");
  await expect(recordTelemetry(String(new mongoose.Types.ObjectId()),input,{driverId:String(driver._id)})).rejects.toThrow("Vehicle not assigned");
});
it("does not assign an old journey packet to the current running journey",async()=>{
  const previous=await Journey.create({organizationId:org._id,vehicleId:vehicle._id,driverId:driver._id,state:"FINISHED"});
  await expect(ingest(sample(1_200_000,{journeyId:String(previous._id)}))).rejects.toThrow("RUNNING journey");
  expect(await RouteSessionPosition.countDocuments({organizationId:org._id})).toBe(0);
});
it("keeps latest GPS under simultaneous ingest",async()=>{
  const old=sample(3000,{latitude:20.0001});const fresh=sample(1000);
  await Promise.all([ingest(old),ingest(fresh)]);
  expect((await Vehicle.findById(vehicle._id))?.lastLocation.latitude).toBe(20);
});
it("stabilizes stopped jitter and keeps raw history with renewed life",async()=>{
  await ingest(sample(4000,{speedMps:0,accuracy:5}));
  const input=sample(1000,{latitude:20.00003,speedMps:0,accuracy:5});
  const result=await ingest(input);
  expect(result.latitude).toBe(20);expect(result.recordedAt).toBe(input.recordedAt.toISOString());
  expect((await RouteSessionPosition.findOne({packetId:input.packetId}))?.latitude).toBe(20.00003);
});
it("quarantines a jump and recovers only on another consistent fix",async()=>{
  await ingest(sample(6000,{accuracy:5}));
  const jump=sample(3000,{latitude:20.01,accuracy:5});
  expect((await ingest(jump)).latitude).toBe(20);
  expect((await ingest(jump)).latitude).toBe(20);
  const recovered=await ingest(sample(0,{latitude:20.01003,accuracy:5}));
  expect(recovered.latitude).toBe(20.01003);
});
