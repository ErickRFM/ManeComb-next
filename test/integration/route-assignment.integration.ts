import mongoose from "mongoose";
import {randomUUID} from "node:crypto";
import {afterAll,beforeAll,expect,it} from "vitest";
import {connectDb} from "@/src/lib/db";
import {requireIntegrationDatabase} from "../support/integration-database";
import {Organization} from "@/src/core/models/Organization";
import {User} from "@/src/core/models/User";
import {Vehicle} from "@/src/core/models/Vehicle";
import {Route} from "@/src/core/models/Route";
import {VehicleRouteAssignment} from "@/src/core/models/VehicleRouteAssignment";
import {activateVehicleRouteAssignment,upsertVehicleRouteAssignment} from "@/src/core/services/route-assignments";

let db="";
beforeAll(async()=>{
  db=requireIntegrationDatabase(process.env.MONGODB_URI);
  await connectDb();
  if(mongoose.connection.name!==db)throw new Error("Route assignment QA DB mismatch");
  await Promise.all(Object.values(mongoose.models).map(model=>model.init()));
});
afterAll(async()=>{
  if(db&&mongoose.connection.name===db)await mongoose.connection.db?.dropDatabase();
  await mongoose.disconnect();
});

it("keeps exactly one ACTIVE route per vehicle and projects it onto Vehicle.routeId",async()=>{
  const org=await Organization.create({name:"Assignments QA",slug:"assign-"+randomUUID()});
  const owner=await User.create({organizationId:org._id,name:"Owner",email:randomUUID()+"@example.invalid",passwordHash:"x",roles:["owner"],channel:"company_portal"});
  const vehicle=await Vehicle.create({organizationId:org._id,economicNumber:"A-"+randomUUID()});
  const [r1,r2]=await Route.create([
    {organizationId:org._id,name:"R1 "+randomUUID(),geometry:[{latitude:19.3,longitude:-98.2},{latitude:19.31,longitude:-98.21}],status:"active",revision:2},
    {organizationId:org._id,name:"R2 "+randomUUID(),geometry:[{latitude:19.32,longitude:-98.22},{latitude:19.33,longitude:-98.23}],status:"active",revision:4}
  ]);

  await upsertVehicleRouteAssignment({organizationId:String(org._id),vehicleId:String(vehicle._id),routeId:String(r1._id),actorUserId:String(owner._id),status:"AVAILABLE",priority:10});
  await upsertVehicleRouteAssignment({organizationId:String(org._id),vehicleId:String(vehicle._id),routeId:String(r2._id),actorUserId:String(owner._id),status:"AVAILABLE",priority:20});

  const first=await activateVehicleRouteAssignment({organizationId:String(org._id),vehicleId:String(vehicle._id),routeId:String(r1._id),actorUserId:String(owner._id)});
  expect(first.status).toBe("ACTIVE");
  expect(first.routeRevision).toBe(2);

  const second=await activateVehicleRouteAssignment({organizationId:String(org._id),vehicleId:String(vehicle._id),routeId:String(r2._id),actorUserId:String(owner._id)});
  expect(second.status).toBe("ACTIVE");
  expect(second.routeRevision).toBe(4);
  expect(await VehicleRouteAssignment.countDocuments({organizationId:org._id,vehicleId:vehicle._id,status:"ACTIVE"})).toBe(1);
  expect((await VehicleRouteAssignment.findOne({organizationId:org._id,vehicleId:vehicle._id,routeId:r1._id}))?.status).toBe("AVAILABLE");
  expect(String((await Vehicle.findById(vehicle._id))?.routeId)).toBe(String(r2._id));
});

it("rejects invalid schedule windows and cross-tenant routes",async()=>{
  const [a,b]=await Organization.create([
    {name:"Tenant A",slug:"assign-a-"+randomUUID()},
    {name:"Tenant B",slug:"assign-b-"+randomUUID()}
  ]);
  const vehicle=await Vehicle.create({organizationId:a._id,economicNumber:"V-"+randomUUID()});
  const foreign=await Route.create({organizationId:b._id,name:"Foreign "+randomUUID(),geometry:[{latitude:19,longitude:-98},{latitude:19.1,longitude:-98.1}],status:"active"});
  await expect(upsertVehicleRouteAssignment({
    organizationId:String(a._id),vehicleId:String(vehicle._id),routeId:String(foreign._id),
    status:"SCHEDULED",scheduledFrom:new Date("2026-10-03T10:00:00Z"),scheduledUntil:new Date("2026-10-03T09:00:00Z")
  })).rejects.toThrow("scheduledUntil must be after scheduledFrom");

  await expect(upsertVehicleRouteAssignment({
    organizationId:String(a._id),vehicleId:String(vehicle._id),routeId:String(foreign._id),status:"AVAILABLE"
  })).rejects.toThrow("Route not found");
});
