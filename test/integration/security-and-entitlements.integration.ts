import mongoose from "mongoose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { connectDb } from "@/src/lib/db";
import { createSessionForUser, revokeSession, verifySessionToken } from "@/src/lib/auth";
import { Organization } from "@/src/core/models/Organization";
import { Subscription } from "@/src/core/models/Subscription";
import { User } from "@/src/core/models/User";
import { Vehicle } from "@/src/core/models/Vehicle";
import { GET as getVehicles, POST as createVehicle } from "@/app/api/vehicles/route";

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

  beforeAll(async()=>{
    await connectDb();
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
    await mongoose.connection.db?.dropDatabase();
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
});
