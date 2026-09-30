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
  const token=await new SignJWT({channel,roles:[channel==="company_portal"?"owner":"driver"],mfaVerified:true})
    .setProtectedHeader({alg:"HS256"}).setSubject("ui-qa-user").setIssuedAt().setExpirationTime("5m")
    .sign(new TextEncoder().encode(process.env.AUTH_SECRET));
  await context.addCookies([{name:"manecomb_session",value:token,url:base}]);
  const page=await context.newPage();
  await page.route("**/api/**",route=>route.fulfill({status:200,json:{}}));
  await page.route("**/api/auth/session",route=>route.fulfill({json:{user:{id:"ui-qa-user",name:"QA User",roles:[channel==="company_portal"?"owner":"driver"],channel}}}));
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
  await run("portal viewer sees permitted navigation and drawer restores keyboard focus",async()=>{
    const page=await pageFor("company_portal");
    await page.route("**/api/auth/session",route=>route.fulfill({json:{user:{name:"QA Viewer",roles:["viewer"],channel:"company_portal"}}}));
    await page.route("**/api/locations/live",route=>route.fulfill({json:{units:[]}}));
    await page.goto(base+"/portal/monitoreo");await page.getByRole("button",{name:"Abrir menú"}).click();
    const drawer=page.getByRole("dialog",{name:"Menú móvil"});
    await drawer.getByRole("link",{name:"Mapa",exact:true}).waitFor();
    for(const name of ["Conductores","Documentos","Chat","Radio / RTC","Incidencias","Facturación"])assert.equal(await drawer.getByRole("link",{name,exact:true}).count(),0);
    await drawer.getByRole("button",{name:"Cerrar sesión"}).focus();await page.keyboard.press("Tab");
    assert.equal(await drawer.getByRole("button",{name:"Cerrar menú"}).evaluate(node=>node===document.activeElement),true);
    await page.keyboard.press("Escape");assert.equal(await drawer.count(),0);
    assert.equal(await page.getByRole("button",{name:"Abrir menú"}).evaluate(node=>node===document.activeElement),true);
    await page.context().close();
  });
  await run("driver navigation retains SOS and logout failure is recoverable",async()=>{
    const page=await pageFor("mobile_operations");let failed=true;
    await page.route("**/api/auth/logout",route=>failed?route.abort():route.fulfill({json:{ok:true}}));
    await page.goto(base+"/operacion/mas");
    for(const name of ["Mapa","Chat","Radio","Alertas","Más"])assert.equal(await page.getByRole("navigation").getByRole("link",{name,exact:true}).count(),1);
    await page.getByRole("link",{name:"Reportar emergencia SOS",exact:true}).first().waitFor();
    await page.getByRole("button",{name:"Cerrar sesión"}).click();await page.locator('p[role="alert"]').waitFor();
    assert.match(page.url(),/operacion\/mas/);failed=false;await page.getByRole("button",{name:"Cerrar sesión"}).click();await page.waitForURL("**/login?surface=operation");
    await page.context().close();
  });
  await run("MFA verification network failure restores retry control",async()=>{
    const page=await pageFor("platform_admin");
    await page.route("**/api/auth/mfa/setup",route=>route.fulfill({status:409,json:{error:"ALREADY_CONFIGURED"}}));
    await page.route("**/api/auth/mfa/verify",route=>route.abort());
    await page.goto(base+"/mfa");await page.locator('input[name="code"]').fill("123456");await page.getByRole("button",{name:"Verificar",exact:true}).click();
    await page.waitForFunction(()=>!document.querySelector('button[type="submit"],form button')?.disabled,{},{timeout:3000});
    await page.locator('p[role="alert"]').waitFor();await page.context().close();
  });
  for(const item of [
    {path:"/recuperar-password",api:"recover",field:"Correo electrónico",value:"qa@example.test",button:"Enviar enlace"},
    {path:"/restablecer-password?token=ui-qa",api:"reset-password",field:"Nueva contraseña",value:"QA-valid-password-123",button:"Cambiar contraseña"},
    {path:"/activar",api:"activate",field:"Llave de activación",value:"QA-KEY",button:"Activar dispositivo"}
  ])await run(item.api+" network failure preserves retry and input",async()=>{
    const page=await pageFor("mobile_operations");await page.route("**/api/auth/"+item.api,route=>route.abort());
    await page.goto(base+item.path);await page.getByLabel(item.field).fill(item.value);await page.getByRole("button",{name:item.button,exact:true}).click();
    await page.locator('p[role="alert"]').waitFor();assert.equal(await page.getByRole("button",{name:item.button,exact:true}).isEnabled(),true);
    assert.equal(await page.getByLabel(item.field).inputValue(),item.value);await page.context().close();
  });
  await run("chat preserves realtime during history load and retries ACK failure with the same ID",async()=>{
    const page=await pageFor("company_portal");const ids=[];
    const incoming={_id:"incoming",senderUserId:"other",channelId:"dispatch",kind:"text",body:"Realtime conservado",clientMessageId:"incoming-client",createdAt:new Date().toISOString()};
    await page.route("**/api/chat/users",route=>route.fulfill({json:{users:[]}}));
    await page.route("**/api/chat/messages?**",async route=>{await new Promise(resolve=>setTimeout(resolve,600));await route.fulfill({json:{messages:[]}})});
    await page.routeWebSocket("**/socket.io/**",ws=>{
      ws.send('0'+JSON.stringify({sid:"ui-qa",upgrades:[],pingInterval:25000,pingTimeout:20000,maxPayload:1000000}));
      ws.onMessage(raw=>{
        const frame=String(raw);
        if(frame==="40"){ws.send('40'+JSON.stringify({sid:"ui-qa-socket"}));return}
        const match=frame.match(/^42(\d*)(\[.*)$/);if(!match)return;
        const [event,payload]=JSON.parse(match[2]);
        if(event==="chat:join")ws.send('42'+JSON.stringify(["chat:message",incoming]));
        if(event==="chat:message"){
          ids.push(payload.clientMessageId);
          const saved={...payload,_id:"saved",senderUserId:"ui-qa-user",createdAt:new Date().toISOString()};
          ws.send('43'+match[1]+JSON.stringify([ids.length===1?{ok:false,error:"QA_FAILURE"}:{ok:true,message:saved}]));
        }
      });
    });
    await page.goto(base+"/portal/chat");await page.getByRole("button",{name:/Central de despacho/}).click();
    await page.getByText("Realtime conservado",{exact:true}).waitFor();
    await page.waitForFunction(()=>document.querySelector('[role="log"]')?.getAttribute("aria-busy")==="false");
    assert.equal(await page.getByText("Realtime conservado",{exact:true}).count(),1);
    await page.getByRole("textbox",{name:"Mensaje",exact:true}).fill("Mensaje con reintento");await page.getByRole("button",{name:"Enviar",exact:true}).click();
    await page.getByRole("button",{name:"Reintentar envío"}).click();
    await page.waitForFunction(()=>!Array.from(document.querySelectorAll("button")).some(button=>button.textContent==="Reintentar envío"));
    assert.equal(ids.length,2);assert.equal(ids[0],ids[1]);assert.equal(await page.getByText("Mensaje con reintento",{exact:true}).count(),1);
    await page.getByRole("button",{name:"Volver a conversaciones"}).click();await page.getByRole("button",{name:/Central de despacho/}).waitFor();
    await page.context().close();
  });
}finally{
  await browser.close();await mkdir("artifacts/functional-ui-qa",{recursive:true});
  await writeFile("artifacts/functional-ui-qa/report.json",JSON.stringify({generatedAt:new Date().toISOString(),checks},null,2));
}
