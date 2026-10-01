import mongoose from "mongoose";
import {afterAll,beforeAll,expect,it} from "vitest";
import {connectDb} from "@/src/lib/db";
import {createSessionForUser} from "@/src/lib/auth";
import {Organization} from "@/src/core/models/Organization";
import {User} from "@/src/core/models/User";
import {Vehicle} from "@/src/core/models/Vehicle";
import {Incident} from "@/src/core/models/Incident";
import {GET,POST} from "@/app/api/incidents/route";
import {requireIntegrationDatabase} from "../support/integration-database";
let db="",driverToken="",ownerToken="",ownVehicle="",otherVehicle="",foreignVehicle="",ownIncident="";
const request=(method:string,token:string,body?:unknown)=>new Request("http://localhost/api/incidents",{method,headers:{authorization:"Bearer "+token,"content-type":"application/json"},body:body?JSON.stringify(body):undefined});
beforeAll(async()=>{
  db=requireIntegrationDatabase(process.env.MONGODB_URI);await connectDb();
  if(mongoose.connection.name!==db)throw new Error("Integration database mismatch");
  await Promise.all(Object.values(mongoose.models).map(model=>model.init()));
  const [a,b]=await Organization.create([{name:"Incident QA A",slug:"incident-qa-a"},{name:"Incident QA B",slug:"incident-qa-b"}]);
  const [driver,other,owner]=await User.create([
    {organizationId:a._id,email:"incident-driver@example.test",passwordHash:"x",name:"Driver QA",roles:["driver"],channel:"mobile_operations",active:true},
    {organizationId:a._id,email:"incident-other@example.test",passwordHash:"x",name:"Other QA",roles:["driver"],channel:"mobile_operations",active:true},
    {organizationId:a._id,email:"incident-owner@example.test",passwordHash:"x",name:"Owner QA",roles:["owner"],channel:"company_portal",active:true}
  ]);
  const vehicles=await Vehicle.create([
    {organizationId:a._id,economicNumber:"OWN",driverId:driver._id},
    {organizationId:a._id,economicNumber:"OTHER",driverId:other._id},
    {organizationId:b._id,economicNumber:"FOREIGN"}
  ]);
  [ownVehicle,otherVehicle,foreignVehicle]=vehicles.map(item=>String(item._id));
  const incidents=await Incident.create([
    {organizationId:a._id,driverId:driver._id,type:"traffic",message:"Own"},
    {organizationId:a._id,driverId:other._id,type:"traffic",message:"Other"},
    {organizationId:b._id,driverId:driver._id,type:"traffic",message:"Foreign"}
  ]);
  ownIncident=String(incidents[0]._id);
  driverToken=(await createSessionForUser(driver)).token;ownerToken=(await createSessionForUser(owner)).token;
});
afterAll(async()=>{if(db&&mongoose.connection.name===db)await mongoose.connection.db?.dropDatabase();await mongoose.disconnect()});
it("driver alerts only include the authenticated driver's incidents in their tenant",async()=>{
  const response=await GET(request("GET",driverToken));expect(response.status).toBe(200);
  expect((await response.json()).incidents.map((item:any)=>item._id)).toEqual([ownIncident]);
});
it("rejects incidents linked to a foreign vehicle or another driver's assigned vehicle",async()=>{
  for(const [token,vehicleId] of [[driverToken,otherVehicle],[driverToken,foreignVehicle],[ownerToken,foreignVehicle]]){
    const response=await POST(request("POST",token,{type:"mechanical",vehicleId}));expect(response.status).toBe(403);
  }
});
it("allows the driver's assigned vehicle and rejects malformed vehicle identifiers",async()=>{
  const allowed=await POST(request("POST",driverToken,{type:"mechanical",vehicleId:ownVehicle}));expect(allowed.status).toBe(201);
  const invalid=await POST(request("POST",driverToken,{type:"mechanical",vehicleId:"invalid"}));expect(invalid.status).toBe(400);
});
