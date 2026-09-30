import mongoose from "mongoose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { connectDb } from "@/src/lib/db";
import { createSessionForUser, revokeSession, verifySessionToken } from "@/src/lib/auth";
import { Organization } from "@/src/core/models/Organization";
import { Subscription } from "@/src/core/models/Subscription";
import { User } from "@/src/core/models/User";
import { Vehicle } from "@/src/core/models/Vehicle";
import { GET as getVehicles, POST as createVehicle } from "@/app/api/vehicles/route";
import { PATCH as patchVehicle } from "@/app/api/vehicles/[vehicleId]/route";
import { requireIntegrationDatabase } from "../support/integration-database";
import { enqueueOutboxEvent } from "@/src/core/services/outbox";
import { OutboxEvent } from "@/src/core/models/OutboxEvent";

function jsonRequest(method:string,token:string,body?:unknown){
  return new Request("http://localhost/api/vehicles",{
    method,
    headers:{
      authorization:"Bearer "+token,
      ...(body?{"content-type":"application/json"}:{})
    },
    body:body?JSON.stringify(body):undefined
  });
}

describe("tenant security and subscription entitlements",()=>{
  let ownerToken="";
  let viewerToken="";
  let otherOwnerToken="";
  let viewerId="";
  let ownedDatabase="";

  beforeAll(async()=>{
    const expectedDatabase=requireIntegrationDatabase(process.env.MONGODB_URI);
    await connectDb();
    if(mongoose.connection.name!==expectedDatabase)throw new Error("Integration database mismatch");
    ownedDatabase=expectedDatabase;
    await mongoose.connection.db?.dropDatabase();

    const [orgA,orgB]=await Organization.create([
      {name:"Empresa A",slug:"empresa-a",planCode:"fleet-2"},
      {name:"Empresa B",slug:"empresa-b",planCode:"unsubscribed"}
    ]);

    const [owner,viewer,otherOwner]=await User.create([
      {organizationId:orgA._id,email:"owner-a@example.test",passwordHash:"x",name:"Owner A",roles:["owner"],channel:"company_portal",active:true},
      {organizationId:orgA._id,email:"viewer-a@example.test",passwordHash:"x",name:"Viewer A",roles:["viewer"],channel:"company_portal",active:true},
      {organizationId:orgB._id,email:"owner-b@example.test",passwordHash:"x",name:"Owner B",roles:["owner"],channel:"company_portal",active:true}
    ]);

    await Subscription.create({
      organizationId:orgA._id,
      planCode:"fleet-2",
      status:"active",
      provider:"manual",
      vehicleLimit:2,
      currentPeriodEnd:new Date(Date.now()+7*24*60*60*1000)
    });

    ownerToken=(await createSessionForUser(owner)).token;
    viewerToken=(await createSessionForUser(viewer)).token;
    otherOwnerToken=(await createSessionForUser(otherOwner)).token;
    viewerId=String(viewer._id);
  });

  afterAll(async()=>{
    if(ownedDatabase && mongoose.connection.name===ownedDatabase)await mongoose.connection.db?.dropDatabase();
    await mongoose.disconnect();
  });

  it("blocks viewer mutations while allowing owner",async()=>{
    const denied=await createVehicle(jsonRequest("POST",viewerToken,{economicNumber:"C-1"}));
    expect(denied.status).toBe(403);

    const allowed=await createVehicle(jsonRequest("POST",ownerToken,{economicNumber:"C-1"}));
    expect(allowed.status).toBe(201);
  });

  it("enforces the paid fleet vehicle limit",async()=>{
    const second=await createVehicle(jsonRequest("POST",ownerToken,{economicNumber:"C-2"}));
    expect(second.status).toBe(201);

    const third=await createVehicle(jsonRequest("POST",ownerToken,{economicNumber:"C-3"}));
    expect(third.status).toBe(409);
    expect((await third.json()).error).toBe("VEHICLE_LIMIT_REACHED");
  });

  it("never returns another organization's vehicles",async()=>{
    const response=await getVehicles(jsonRequest("GET",otherOwnerToken));
    expect(response.status).toBe(200);
    const body=await response.json();
    expect(body.vehicles).toHaveLength(0);
    expect(await Vehicle.countDocuments()).toBe(2);
  });

  it("rejects a revoked session",async()=>{
    const parsed=await verifySessionToken(viewerToken);
    await revokeSession(parsed.jti);
    const response=await getVehicles(jsonRequest("GET",viewerToken));
    expect(response.status).toBe(401);
  });

  it("checks capacity when restoring an archived vehicle",async()=>{
    const vehicle=await Vehicle.findOne({economicNumber:"C-1"});
    const params=Promise.resolve({vehicleId:String(vehicle!._id)});
    expect((await patchVehicle(jsonRequest("PATCH",ownerToken,{status:"archived"}),{params})).status).toBe(200);
    expect((await createVehicle(jsonRequest("POST",ownerToken,{economicNumber:"C-3"}))).status).toBe(201);
    const denied=await patchVehicle(jsonRequest("PATCH",ownerToken,{status:"active"}),{params});
    expect(denied.status).toBe(409);
    expect((await denied.json()).error).toBe("VEHICLE_LIMIT_REACHED");
    await Vehicle.updateOne({economicNumber:"C-3"},{$set:{status:"archived"}});
    expect((await patchVehicle(jsonRequest("PATCH",ownerToken,{status:"active"}),{params})).status).toBe(200);
  });

  it("invalidates an old token when server-side roles change",async()=>{
    const viewer=await User.findById(viewerId);
    viewer!.roles=["support"];
    await viewer!.save();

    const freshViewer=await User.findById(viewerId);
    const freshToken=(await createSessionForUser(freshViewer!)).token;

    await User.updateOne({_id:viewerId},{$set:{roles:["admin"]}});
    const response=await getVehicles(jsonRequest("GET",freshToken));
    expect(response.status).toBe(401);
  });

  it("serializes concurrent restores against the fleet limit",async()=>{
    const original=await Vehicle.findOne({economicNumber:"C-1"});
    await Vehicle.updateOne({_id:original!._id},{$set:{status:"archived"}});
    const other=await Vehicle.findOne({economicNumber:"C-3"});
    const results=await Promise.all([original,other].map(vehicle=>patchVehicle(jsonRequest("PATCH",ownerToken,{status:"active"}),{params:Promise.resolve({vehicleId:String(vehicle!._id)})})));
    expect(results.map(response=>response.status).sort()).toEqual([200,409]);
    expect(await Vehicle.countDocuments({organizationId:original!.organizationId,status:{$ne:"archived"}})).toBe(2);
  });

  it("outbox retries create one notification without resetting a processed event",async()=>{
    const id=String(new mongoose.Types.ObjectId());
    const first=await enqueueOutboxEvent("push.send",{body:"canonical"},null,id);
    await OutboxEvent.updateOne({_id:first._id},{$set:{status:"processed"}});
    await enqueueOutboxEvent("push.send",{body:"replay"},null,id);
    expect(await OutboxEvent.countDocuments({_id:id})).toBe(1);
    const saved=await OutboxEvent.findById(id);
    expect(saved!.status).toBe("processed");
    expect(saved!.payload.body).toBe("canonical");
  });
});
