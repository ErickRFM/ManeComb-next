import mongoose from "mongoose";
import {beforeAll,afterAll,expect,it} from "vitest";
import {connectDb} from "@/src/lib/db";
import {createSessionForUser} from "@/src/lib/auth";
import {Organization} from "@/src/core/models/Organization";
import {User} from "@/src/core/models/User";
import {Route} from "@/src/core/models/Route";
import {Session} from "@/src/core/models/Session";
import {DeviceSession} from "@/src/core/models/DeviceSession";
import {POST} from "@/app/api/routes/route";
import {GET,PATCH} from "@/app/api/routes/[routeId]/route";
import {PATCH as editDriver} from "@/app/api/drivers/[driverId]/route";
import {requireIntegrationDatabase} from "../support/integration-database";
let db="",owner="",viewer="",otherOwner="",routeId="",driverId="";
const request=(method:string,token:string,body?:unknown)=>new Request("http://localhost/api/routes",{method,headers:{authorization:"Bearer "+token,"content-type":"application/json"},body:body?JSON.stringify(body):undefined});
const geometry=[{latitude:19.3,longitude:-98.2},{latitude:19.31,longitude:-98.21}];
beforeAll(async()=>{
  db=requireIntegrationDatabase(process.env.MONGODB_URI);await connectDb();if(mongoose.connection.name!==db)throw new Error("QA DB mismatch");
  await Promise.all(Object.values(mongoose.models).map(model=>model.init()));
  const [a,b]=await Organization.create([{name:"Route QA A",slug:"route-qa-a"},{name:"Route QA B",slug:"route-qa-b"}]);
  const users=await User.create([
    {organizationId:a._id,name:"Route owner",email:"route-owner@example.test",passwordHash:"x",active:true,channel:"company_portal",roles:["owner"]},
    {organizationId:a._id,name:"Route viewer",email:"route-viewer@example.test",passwordHash:"x",active:true,channel:"company_portal",roles:["viewer"]},
    {organizationId:b._id,name:"Other owner",email:"route-other@example.test",passwordHash:"x",active:true,channel:"company_portal",roles:["owner"]},
    {organizationId:a._id,name:"Driver original",email:"route-driver@example.test",passwordHash:"x",active:true,channel:"mobile_operations",roles:["driver"]}
  ]);
  [owner,viewer,otherOwner]=await Promise.all(users.slice(0,3).map(async user=>(await createSessionForUser(user)).token));driverId=String(users[3]._id);
});
afterAll(async()=>{if(db&&mongoose.connection.name===db)await mongoose.connection.db?.dropDatabase();await mongoose.disconnect()});
it("persists geometry and stop order then updates the same route with a new revision",async()=>{
  const created=await POST(request("POST",owner,{name:"Ruta persistida QA",geometry,stops:[{name:"Primera",order:0,...geometry[0],radiusM:50},{name:"Segunda",order:1,...geometry[1],radiusM:50}],status:"active"}));
  expect(created.status).toBe(201);routeId=String((await created.json()).route._id);
  const params=Promise.resolve({routeId});
  const updated=await PATCH(request("PATCH",owner,{name:"Ruta revisada QA",stops:[{name:"Segunda",order:0,...geometry[1],radiusM:50},{name:"Primera",order:1,...geometry[0],radiusM:50}]}),{params});
  expect(updated.status).toBe(200);
  const loaded=await GET(request("GET",viewer),{params});expect(loaded.status).toBe(200);
  const result=(await loaded.json()).route;expect(result.geometry).toEqual(geometry);expect(result.revision).toBe(2);expect(result.stops.map((stop:any)=>stop.name)).toEqual(["Segunda","Primera"]);
  expect(await Route.countDocuments({name:/QA$/})).toBe(1);
});
it("rejects invalid geometry, viewer writes and another tenant's route",async()=>{
  expect((await POST(request("POST",owner,{name:"Invalid",geometry:[geometry[0]]}))).status).toBe(400);
  expect((await PATCH(request("PATCH",viewer,{name:"Forbidden"}),{params:Promise.resolve({routeId})})).status).toBe(403);
  expect((await GET(request("GET",otherOwner),{params:Promise.resolve({routeId})})).status).toBe(404);
});
it("edits driver identity without changing activation and denies foreign updates",async()=>{
  const original=await User.findById(driverId);
  const credential=await createSessionForUser(original);
  const device=await DeviceSession.create({tokenHash:"driver-edit-qa",organizationId:original.organizationId,userId:driverId,vehicleId:new mongoose.Types.ObjectId(),journeyId:new mongoose.Types.ObjectId(),expiresAt:new Date(Date.now()+3600000)});
  const params=Promise.resolve({driverId});
  const changed=await editDriver(request("PATCH",owner,{name:"Driver corregido",email:"driver-new@example.test"}),{params});expect(changed.status).toBe(200);
  const driver=await User.findById(driverId);expect(driver.name).toBe("Driver corregido");expect(driver.email).toBe("driver-new@example.test");expect(driver.active).toBe(true);expect(driver.roles).toEqual(["driver"]);
  expect((await Session.findOne({userId:driverId})).revokedAt).toBeNull();
  expect((await DeviceSession.findById(device._id)).revokedAt).toBeNull();
  expect(credential.token).toBeTruthy();
  expect((await editDriver(request("PATCH",otherOwner,{name:"Foreign"}),{params})).status).toBe(404);
});
it("explicit driver deactivation still revokes web and device credentials",async()=>{
  expect((await editDriver(request("PATCH",owner,{active:false}),{params:Promise.resolve({driverId})})).status).toBe(200);
  expect((await Session.findOne({userId:driverId})).revokedAt).toBeInstanceOf(Date);
  expect((await DeviceSession.findOne({userId:driverId})).revokedAt).toBeInstanceOf(Date);
});
