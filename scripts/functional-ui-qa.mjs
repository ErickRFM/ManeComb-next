// Browser regression tests exercise real pages with isolated API responses, never product fixtures.
import assert from "node:assert/strict";
import {mkdir,writeFile} from "node:fs/promises";
import {chromium} from "playwright";
import {SignJWT} from "jose";

const base=process.env.VISUAL_QA_BASE_URL;
if(!base||!process.env.AUTH_SECRET)throw new Error("Use scripts/test-local-visual.mjs --functional for an isolated server");
const browser=await chromium.launch({headless:true});
const checks=[];
async function run(name,fn){await fn();checks.push({name,status:"PASS"});console.log("PASS "+name)}
async function pageFor(channel){
  const context=await browser.newContext({viewport:{width:390,height:844}});
  const token=await new SignJWT({channel,roles:[channel==="company_portal"?"company_owner":"driver"],mfaVerified:true})
    .setProtectedHeader({alg:"HS256"}).setSubject("ui-qa-user").setIssuedAt().setExpirationTime("5m")
    .sign(new TextEncoder().encode(process.env.AUTH_SECRET));
  await context.addCookies([{name:"manecomb_session",value:token,url:base}]);
  const page=await context.newPage();
  await page.route("**/api/**",route=>route.fulfill({status:200,json:{}}));
  await page.route("**/socket.io/**",route=>route.abort());
  return page;
}
const unit={vehicleId:"ui-unit",economicNumber:"QA-01",status:"active",driverId:"ui-qa-user",routeId:"ui-route",journeyId:"ui-journey",latitude:19.3,longitude:-98.2,speedKmH:20,heading:0,recordedAt:new Date().toISOString(),freshness:"live",routeName:"Ruta QA",progressPercent:25,distanceFromRouteM:0,distanceRemainingM:1200,isOffRoute:false,routeState:"on_route",etaMinutes:4,etaAt:null,nextStop:{name:"Parada QA",order:1,latitude:19.31,longitude:-98.21,distanceRemainingM:1000}};
try{
  await run("installed entry opens operational login without marketing",async()=>{
    const page=await pageFor("mobile_operations");
    await page.route("**/api/auth/session",route=>route.fulfill({status:401,json:{error:"UNAUTHENTICATED"}}));
    await page.goto(base+"/app");await page.waitForURL("**/login?surface=operation");
    assert.equal(await page.getByRole("link",{name:/registrar|crear cuenta/i}).count(),0);
    await page.context().close();
  });
  await run("installed entry recovers session request and redirects by actual channel",async()=>{
    const page=await pageFor("company_portal");let failed=true;
    await page.route("**/api/auth/session",route=>route.fulfill({status:failed?503:200,json:failed?{error:"UNAVAILABLE"}:{user:{channel:"company_portal"}}}));
    await page.goto(base+"/app");await page.getByRole("button",{name:"Reintentar"}).waitFor();
    failed=false;await page.getByRole("button",{name:"Reintentar"}).click();await page.waitForURL("**/portal/monitoreo");
    await page.context().close();
  });
  await run("fleet loads without Mapbox, filters and clears hidden selection",async()=>{
    const page=await pageFor("company_portal");
    await page.route("**/api/locations/live",route=>route.fulfill({json:{units:[unit]}}));
    await page.goto(base+"/portal/monitoreo");
    await page.getByRole("button",{name:/QA-01/}).click();
    await page.getByRole("complementary",{name:"Detalle de QA-01"}).waitFor();
    await page.getByRole("textbox",{name:"Buscar unidad o ruta"}).fill("otra");
    await page.getByText("Sin coincidencias",{exact:true}).waitFor();
    assert.equal(await page.getByRole("complementary",{name:"Detalle de QA-01"}).count(),0);
    await page.getByRole("textbox",{name:"Buscar unidad o ruta"}).fill("");
    await page.getByRole("button",{name:/QA-01/}).waitFor();
    await page.context().close();
  });
  await run("fleet retry distinguishes unavailable data from empty fleet",async()=>{
    const page=await pageFor("company_portal");let failed=true;
    await page.route("**/api/locations/live",route=>route.fulfill({status:failed?503:200,json:failed?{error:"UNAVAILABLE"}:{units:[]}}));
    await page.goto(base+"/portal/monitoreo");await page.getByText("Flota no disponible",{exact:true}).waitFor();
    failed=false;await page.getByRole("button",{name:"Reintentar"}).click();await page.getByText("Sin unidades",{exact:true}).waitFor();
    await page.context().close();
  });
  await run("driver keeps journey and telemetry when map provider is unavailable",async()=>{
    const page=await pageFor("mobile_operations");
    await page.route("**/api/operation/navigation",async route=>{await new Promise(resolve=>setTimeout(resolve,600));await route.fulfill({json:{journey:{id:"ui-journey",vehicleId:unit.vehicleId,state:"running",routeId:unit.routeId,startedAt:unit.recordedAt},route:{id:unit.routeId,name:unit.routeName,revision:1,geometry:[],stops:[]},snapshot:unit}})});
    await page.goto(base+"/operacion");await page.getByText("Parada QA",{exact:true}).waitFor();
    await page.getByText("El mapa no está disponible. Los datos de tu jornada siguen accesibles.",{exact:true}).waitFor();
    await page.getByText("20 km/h",{exact:true}).waitFor();
    assert.equal(await page.getByText("No se pudo cargar la operación",{exact:true}).count(),0);
    await page.context().close();
  });
}finally{
  await browser.close();await mkdir("artifacts/functional-ui-qa",{recursive:true});
  await writeFile("artifacts/functional-ui-qa/report.json",JSON.stringify({generatedAt:new Date().toISOString(),checks},null,2));
}
