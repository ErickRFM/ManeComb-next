// Browser regression tests exercise real pages with isolated API responses, never product fixtures.
import assert from "node:assert/strict";
import {mkdir,writeFile} from "node:fs/promises";
import {chromium} from "playwright";
import {SignJWT} from "jose";
import AxeBuilder from "@axe-core/playwright";

const base=process.env.VISUAL_QA_BASE_URL;
if(!base||!process.env.AUTH_SECRET)throw new Error("Use scripts/test-local-visual.mjs --functional for an isolated server");
const browser=await chromium.launch({headless:true,args:["--use-fake-ui-for-media-stream","--use-fake-device-for-media-stream",...(process.env.QA_MAPBOX?["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"]:[])]});
const checks=[];
const failures=[];
async function run(name,fn){if(process.env.QA_FILTER&&!name.includes(process.env.QA_FILTER))return;await fn();checks.push({name,status:"PASS"});console.log("PASS "+name)}
async function pageFor(channel){
  const context=await browser.newContext({viewport:{width:390,height:844}});
  const token=await new SignJWT({channel,roles:[channel==="company_portal"?"owner":"driver"],mfaVerified:true})
    .setProtectedHeader({alg:"HS256"}).setSubject("ui-qa-user").setIssuedAt().setExpirationTime("5m")
    .sign(new TextEncoder().encode(process.env.AUTH_SECRET));
  await context.addCookies([{name:"manecomb_session",value:token,url:base}]);
  const page=await context.newPage();
  page.on("pageerror",error=>console.error("BROWSER ERROR "+String(error.stack).replace(/access_token=[^&\s]+/g,"access_token=[REDACTED]")));
  await page.route("**/api/**",route=>route.fulfill({status:200,json:{}}));
  await page.route("**/api/auth/session",route=>route.fulfill({json:{user:{id:"ui-qa-user",name:"QA User",roles:[channel==="company_portal"?"owner":"driver"],channel}}}));
  await page.route("**/socket.io/**",route=>route.abort());
  return page;
}
const unit={vehicleId:"ui-unit",economicNumber:"QA-01",status:"active",driverId:"ui-qa-user",routeId:"ui-route",journeyId:"ui-journey",latitude:19.3,longitude:-98.2,speedKmH:20,heading:0,recordedAt:new Date().toISOString(),freshness:"live",routeName:"Ruta QA",progressPercent:25,distanceFromRouteM:0,distanceRemainingM:1200,isOffRoute:false,routeState:"on_route",etaMinutes:4,etaAt:null,nextStop:{name:"Parada QA",order:1,latitude:19.31,longitude:-98.21,distanceRemainingM:1000}};
async function realtime(page,onEvent=()=>{}){
  await page.routeWebSocket("**/socket.io/**",ws=>{
    ws.send('0'+JSON.stringify({sid:"media-qa",upgrades:[],pingInterval:25000,pingTimeout:20000,maxPayload:1000000}));
    ws.onMessage(raw=>{const frame=String(raw);if(frame==="40"){ws.send('40'+JSON.stringify({sid:"media-qa-socket"}));return}
      const match=frame.match(/^42(\d*)(\[.*)$/);if(!match)return;const [event,payload]=JSON.parse(match[2]);onEvent(event,payload);
      if(match[1])ws.send('43'+match[1]+JSON.stringify([{ok:true}]));
    });
  });
}
try{
  if(process.env.QA_MAPBOX==="1")await run("Mapbox provider renders 0/1/20/100/500 units with bounded DOM markers",async()=>{
    for(const count of [1,0,20,100,500]){
      const page=await pageFor("company_portal");await page.setViewportSize({width:1366,height:900});
      const provider=[];page.on("response",response=>{const url=new URL(response.url());if(url.hostname.endsWith("mapbox.com"))provider.push({path:url.pathname,status:response.status()})});page.on("requestfailed",request=>{const url=new URL(request.url());if(url.hostname.endsWith("mapbox.com"))provider.push({path:url.pathname,error:request.failure()?.errorText})});
      const units=Array.from({length:count},(_,i)=>({...unit,vehicleId:"map-unit-"+i,economicNumber:"MAP-"+String(i).padStart(3,"0"),latitude:19.3+(i%20)*.002,longitude:-98.2+Math.floor(i/20)*.002}));
      await page.route("**/api/locations/live",route=>route.fulfill({json:{units}}));await page.goto(base+"/portal/monitoreo");
      await page.waitForFunction(()=>{const region=document.querySelector('[aria-label="Mapa de monitoreo en vivo"]');return region?.getAttribute("aria-busy")==="false"},{},{timeout:30000});
      assert.equal(await page.getByText(/No se pudo cargar el mapa|El mapa no está disponible/).count(),0,"Mapbox provider did not load: "+JSON.stringify({provider,webgl:await page.evaluate(()=>Boolean(document.createElement("canvas").getContext("webgl2")))}));
      await page.waitForTimeout(500);assert.equal(await page.locator(".fleet-marker").count(),count>=100?0:count);assert.equal(await page.locator("canvas.mapboxgl-canvas").count(),1);
      if(count){await page.locator(".fleet-list-item").first().click();await page.getByRole("complementary",{name:"Detalle de MAP-000"}).waitFor();await page.getByRole("button",{name:"Cerrar detalle"}).click();await page.getByRole("textbox",{name:"Buscar unidad o ruta"}).fill("MAP-000");await page.waitForFunction(()=>document.querySelectorAll(".fleet-marker").length===1);assert.equal(await page.locator(".fleet-list-item").count(),1)}
      checks.push({name:"Mapbox provider density",count,status:"PASS"});await page.context().close();
    }
  });
  await run("RTC real browser peers connect, hang up and reconnect with fresh audio",async()=>{
    const pages=[await pageFor("mobile_operations"),await pageFor("mobile_operations")],sockets=new Map();
    for(let i=0;i<pages.length;i++){
      const page=pages[i],self="rtc-user-"+i,other="rtc-user-"+(1-i);
      await page.route("**/api/chat/users",route=>route.fulfill({json:{users:[{id:other,name:"Persona RTC "+(1-i)}]}}));await page.route("**/api/rtc/config",route=>route.fulfill({json:{iceServers:[],turnEnabled:false}}));
      await page.routeWebSocket("**/socket.io/**",ws=>{
        sockets.set(self,[...(sockets.get(self)||[]),ws]);ws.send('0'+JSON.stringify({sid:self,upgrades:[],pingInterval:25000,pingTimeout:20000,maxPayload:1000000}));
        ws.onMessage(raw=>{const frame=String(raw);if(frame==="40"){ws.send('40'+JSON.stringify({sid:self+"-socket"}));return}const match=frame.match(/^42(\d*)(\[.*)$/);if(!match)return;const [event,payload]=JSON.parse(match[2]);if(event==="rtc:signal")for(const receiver of sockets.get(payload.targetUserId)||[])receiver.send('42'+JSON.stringify([event,{fromUserId:self,signal:payload.signal}]));if(match[1])ws.send('43'+match[1]+JSON.stringify([{ok:true}]))});
      });
      await page.goto(base+"/operacion/radio");await page.getByLabel("Persona para llamar").selectOption(other);
    }
    for(let attempt=0;attempt<2;attempt++){
      await pages[0].getByRole("button",{name:"Llamar",exact:true}).click();await Promise.all(pages.map(page=>page.getByText("Llamada conectada",{exact:true}).waitFor({timeout:15000})));
      for(const page of pages)assert.equal(await page.locator("audio").evaluate(node=>node.srcObject?.getAudioTracks().some(track=>track.readyState==="live")),true);
      await pages[0].getByRole("button",{name:"Colgar",exact:true}).click();await Promise.all(pages.map(page=>page.getByText("Sin llamada",{exact:true}).waitFor()));
      for(const page of pages)assert.equal(await page.locator("audio").evaluate(node=>node.srcObject),null);
    }
    await Promise.all(pages.map(page=>page.context().close()));
  });
  await run("admin payment network failure stays in confirmation and can retry",async()=>{
    const page=await pageFor("platform_admin");let failed=true;
    await page.route("**/api/admin/manual-payments",route=>route.fulfill({json:{payments:[{_id:"payment-qa",planCode:"fleet-4",amountMxn:400,status:"pending"}]}}));
    await page.route("**/api/admin/manual-payments/payment-qa",route=>failed?route.abort():route.fulfill({json:{payment:{status:"approved"}}}));
    await page.goto(base+"/admin/pagos-manuales");await page.getByRole("button",{name:"Aprobar",exact:true}).click();const dialog=page.getByRole("dialog");await dialog.getByRole("button",{name:"Confirmar aprobación"}).click();
    await dialog.locator('[role="alert"]').waitFor({timeout:3000});failed=false;await dialog.getByRole("button",{name:"Confirmar aprobación"}).click();await dialog.waitFor({state:"detached"});await page.context().close();
  });
  await run("radio releases microphone and floor when window loses focus",async()=>{
    const page=await pageFor("mobile_operations");const events=[];await realtime(page,event=>events.push(event));
    await page.addInitScript(()=>{
      window.__micStops=0;
      const original=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
      navigator.mediaDevices.getUserMedia=async options=>{const stream=await original(options);for(const track of stream.getTracks()){const stop=track.stop.bind(track);track.stop=()=>{window.__micStops++;stop()}}return stream};
    });
    await page.goto(base+"/operacion/radio");await page.getByText("Listo para transmitir",{exact:true}).waitFor();
    const ptt=page.getByRole("button",{name:/PULSA Y HABLA/});await ptt.focus();await page.keyboard.down("Space");await page.getByText("Transmitiendo",{exact:true}).waitFor();
    await page.waitForTimeout(160);
    events.length=0;
    await page.evaluate(()=>window.dispatchEvent(new Event("blur")));
    await page.waitForFunction(()=>window.__micStops>0,{},{timeout:3000});await page.waitForTimeout(150);
    assert.ok(events.includes("radio:audio"),"Normal PTT release must flush the final sub-300ms audio chunk");
    assert.ok(events.indexOf("radio:audio")<events.indexOf("radio:release-floor"),"Flush audio before surrendering the floor");await page.keyboard.up("Space");await page.context().close();
  });
  await run("PTT real MediaRecorder delivers independently decodable audio clips",async()=>{
    const page=await pageFor("mobile_operations"),chunks=[];await realtime(page,(event,payload)=>{if(event==="radio:audio")chunks.push(payload.chunk)});
    await page.goto(base+"/operacion/radio");await page.getByText("Listo para transmitir",{exact:true}).waitFor();
    await page.getByRole("button",{name:/PULSA Y HABLA/}).focus();await page.keyboard.down("Space");await page.getByText("Transmitiendo",{exact:true}).waitFor();
    const deadline=Date.now()+5000;while(chunks.length<3&&Date.now()<deadline)await page.waitForTimeout(30);
    await page.keyboard.up("Space");await page.getByText("Listo para transmitir",{exact:true}).waitFor();assert.ok(chunks.length>=3,"Expected multiple real recorded clips");
    const decoded=await page.evaluate(async chunks=>{const context=new AudioContext();try{return await Promise.all(chunks.map(async chunk=>{try{const audio=await context.decodeAudioData(await (await fetch(chunk)).arrayBuffer());return audio.duration>0}catch{return false}}))}finally{await context.close()}},chunks);
    assert.ok(decoded.every(Boolean),"Each PTT clip must decode independently: "+JSON.stringify(decoded));await page.context().close();
  });
  await run("radio audio rejection stops capture and preserves retry feedback",async()=>{
    const page=await pageFor("mobile_operations");
    await page.addInitScript(()=>{const original=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);navigator.mediaDevices.getUserMedia=async options=>{const stream=await original(options);window.__micStream=stream;return stream}});
    await page.routeWebSocket("**/socket.io/**",ws=>{ws.send('0'+JSON.stringify({sid:"audio-error",upgrades:[],pingInterval:25000,pingTimeout:20000,maxPayload:1000000}));ws.onMessage(raw=>{const frame=String(raw);if(frame==="40"){ws.send('40'+JSON.stringify({sid:"audio-error-socket"}));return}const match=frame.match(/^42(\d*)(\[.*)$/);if(!match)return;const [event,payload]=JSON.parse(match[2]);if(match[1])ws.send('43'+match[1]+JSON.stringify([{ok:event!=="radio:audio"}]));if(event==="radio:release-floor")ws.send('42'+JSON.stringify(["radio:floor",{channelId:payload.channelId,userId:"ui-qa-user",active:false}]))})});
    await page.goto(base+"/operacion/radio");await page.getByText("Listo para transmitir",{exact:true}).waitFor();await page.getByRole("button",{name:/PULSA Y HABLA/}).focus();await page.keyboard.down("Space");await page.getByText("Transmitiendo",{exact:true}).waitFor();
    await page.waitForFunction(()=>window.__micStream?.getTracks().every(track=>track.readyState==="ended"),{},{timeout:3000});await page.keyboard.up("Space");await page.getByRole("button",{name:"Reintentar radio"}).waitFor();await page.waitForTimeout(100);assert.equal(await page.getByText("Radio no disponible",{exact:true}).count(),1);await page.context().close();
  });
  await run("RTC selects real users and stops late microphone after hangup",async()=>{
    const page=await pageFor("mobile_operations");await realtime(page);
    await page.route("**/api/chat/users",route=>route.fulfill({json:{users:[{id:"other",name:"Usuario RTC QA"}]}}));
    await page.route("**/api/rtc/config",route=>route.fulfill({json:{iceServers:[],turnEnabled:false}}));
    await page.addInitScript(()=>{
      window.__micStops=0;window.__mediaResolve=null;
      navigator.mediaDevices.getUserMedia=()=>new Promise(resolve=>{window.__mediaResolve=()=>resolve({getTracks:()=>[{stop:()=>window.__micStops++}]})});
    });
    await page.goto(base+"/operacion/radio");await page.getByLabel("Persona para llamar").selectOption("other");await page.getByRole("button",{name:"Llamar",exact:true}).click();
    await page.waitForFunction(()=>Boolean(window.__mediaResolve));await page.getByRole("button",{name:"Colgar",exact:true}).click();await page.evaluate(()=>window.__mediaResolve());
    await page.waitForFunction(()=>window.__micStops===1,{},{timeout:3000});await page.getByText("Sin llamada",{exact:true}).waitFor();await page.context().close();
  });
  await run("installed entry opens operational login without marketing",async()=>{
    const page=await pageFor("mobile_operations");
    await page.route("**/api/auth/session",route=>route.fulfill({status:401,json:{error:"UNAUTHENTICATED"}}));
    await page.goto(base+"/app");await page.waitForURL("**/login?surface=operation");
    assert.equal(await page.getByRole("link",{name:/registrar|crear cuenta/i}).count(),0);
    assert.equal(await page.getByRole("navigation").count(),0);
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
  await run("unit tabs show actual route and documents, and distinguish forbidden incidents",async()=>{
    const page=await pageFor("company_portal");
    await page.route("**/api/locations/live",route=>route.fulfill({json:{units:[unit]}}));
    await page.route("**/api/routes/ui-route",route=>route.fulfill({json:{route:{name:"Ruta del API",revision:7,status:"active",stops:[{name:"Parada del API",order:0}]}}}));
    await page.route("**/api/incidents",route=>route.fulfill({status:403,json:{error:"FORBIDDEN"}}));
    await page.route("**/api/documents",route=>route.fulfill({json:{documents:[{_id:"own-doc",ownerType:"vehicle",ownerId:unit.vehicleId,kind:"insurance",status:"approved"},{_id:"other-doc",ownerType:"vehicle",ownerId:"other",kind:"other",status:"pending"}]}}));
    await page.goto(base+"/portal/monitoreo");await page.getByRole("button",{name:/QA-01/}).click();
    const detail=page.getByRole("complementary",{name:"Detalle de QA-01"});await detail.getByRole("button",{name:"Expandido"}).click();
    await detail.getByRole("tab",{name:"Ruta",exact:true}).click();await detail.getByText("Parada del API",{exact:true}).waitFor();
    await detail.getByRole("tab",{name:"Incidencias",exact:true}).click();await detail.getByText("Tu rol no permite consultar este detalle.",{exact:true}).waitFor();
    assert.equal(await detail.getByText(/Sin incidencias/).count(),0);
    await detail.getByRole("tab",{name:"Documentos",exact:true}).click();await detail.getByRole("link",{name:"Ver documento",exact:true}).waitFor();
    assert.equal(await detail.getByRole("link",{name:"Ver documento",exact:true}).count(),1);
    assert.equal(await detail.getByRole("link",{name:"Ver documento",exact:true}).getAttribute("href"),"/api/documents/own-doc/download");
    await page.keyboard.press("End");await detail.getByRole("tab",{name:"Telemetría",exact:true}).click();await detail.getByText("Latitud",{exact:true}).waitFor();
    await detail.getByRole("button",{name:"Compacto"}).click();assert.equal(await detail.getByRole("tabpanel").isVisible(),false);
    await detail.getByRole("button",{name:"Medio"}).click();assert.equal(await detail.getByRole("tabpanel").isVisible(),true);
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
  await run("browser GPS survives operation tabs, starts from current journey and stops explicitly",async()=>{
    const page=await pageFor("mobile_operations");
    await page.addInitScript(()=>{
      localStorage.setItem("manecomb.vehicleId","stale-vehicle");localStorage.setItem("manecomb.journeyId","stale-journey");
      window.__gpsStarts=0;window.__gpsStops=0;
      Object.defineProperty(navigator,"geolocation",{configurable:true,value:{watchPosition:()=>{window.__gpsStarts++;return 42},clearWatch:()=>{window.__gpsStops++}}});
    });
    await page.route("**/api/operation/navigation",route=>route.fulfill({json:{journey:{id:"current-journey",vehicleId:"current-vehicle",state:"RUNNING",routeId:null,startedAt:unit.recordedAt},route:null,snapshot:null}}));
    await page.route("**/api/chat/users",route=>route.fulfill({json:{users:[]}}));
    await page.goto(base+"/operacion#controles-jornada");await page.getByRole("button",{name:"Iniciar GPS",exact:true}).click();await page.getByText("GPS web activo · mantén la pantalla encendida",{exact:true}).waitFor();
    assert.equal(await page.getByLabel("Unidad asignada",{exact:true}).inputValue(),"current-vehicle");
    await page.getByRole("navigation").getByRole("link",{name:"Chat",exact:true}).click();await page.waitForURL("**/operacion/chat");
    assert.equal(await page.evaluate(()=>window.__gpsStarts),1);assert.equal(await page.evaluate(()=>window.__gpsStops),0);
    await page.getByRole("navigation").getByRole("link",{name:"Mapa",exact:true}).click();await page.waitForURL("**/operacion");
    await page.getByText("GPS web activo · mantén la pantalla encendida",{exact:true}).waitFor();await page.getByRole("button",{name:"Detener",exact:true}).click();
    assert.equal(await page.evaluate(()=>window.__gpsStarts),1);assert.equal(await page.evaluate(()=>window.__gpsStops),1);
    await page.context().close();
  });
  await run("commercial plan remains selected across registration and checkout retry",async()=>{
    const page=await pageFor("company_portal");let body=null;const keys=[];
    await page.route("**/api/auth/register",route=>{body=route.request().postDataJSON();return route.fulfill({json:{user:{channel:"company_portal"}}})});
    await page.route("**/api/commercial/checkout",route=>{keys.push(route.request().postDataJSON().idempotencyKey);return route.abort()});
    await page.goto(base+"/checkout/fleet-4");await page.getByRole("link",{name:"Registrar empresa",exact:true}).click();await page.waitForURL("**/registro?plan=fleet-4");
    await page.getByLabel("Empresa / línea").fill("Empresa UI QA");await page.getByLabel("Nombre del responsable").fill("Responsable QA");await page.getByLabel("Correo",{exact:true}).fill("qa@example.test");await page.getByLabel("Contraseña",{exact:true}).fill("QA-password-123");
    await page.getByRole("button",{name:"Crear empresa",exact:true}).click();await page.waitForURL("**/checkout/fleet-4");assert.equal(body.organizationName,"Empresa UI QA");
    for(let attempt=0;attempt<2;attempt++){await page.getByRole("button",{name:"Continuar al pago",exact:true}).click();await page.locator('p[role="alert"]').waitFor()}
    assert.equal(keys.length,2);assert.equal(keys[0],keys[1]);await page.context().close();
  });
  await run("route creation persists geometry, stop order and a second save updates the same ID",async()=>{
    const page=await pageFor("company_portal");const calls=[];let saved=null;
    await page.route("**/api/routes",async route=>{
      const request=route.request();if(request.method()!=="POST")return route.fulfill({json:{routes:saved?[saved]:[]}});
      const body=request.postDataJSON();calls.push({method:request.method(),body});saved={...body,_id:"saved-route",revision:1};await route.fulfill({status:201,json:{route:saved}});
    });
    await page.route("**/api/routes/saved-route",async route=>{
      const request=route.request();if(request.method()==="PATCH"){const body=request.postDataJSON();calls.push({method:"PATCH",body});saved={...saved,...body,revision:2}}
      await route.fulfill({json:{route:saved}});
    });
    await page.goto(base+"/portal/rutas/nueva");await page.getByLabel("Nombre",{exact:true}).fill("Ruta desde UI");
    for(const [lat,lng] of [[19.3,-98.2],[19.31,-98.21]]){
      await page.getByLabel("Latitud del punto",{exact:true}).fill(String(lat));await page.getByLabel("Longitud del punto",{exact:true}).fill(String(lng));await page.getByRole("button",{name:"Añadir punto"}).click();
    }
    await page.getByRole("button",{name:"+ Parada",exact:true}).click();await page.getByRole("button",{name:"+ Parada",exact:true}).click();
    await page.getByRole("textbox",{name:"Nombre de parada 1"}).fill("A");await page.getByRole("textbox",{name:"Nombre de parada 2"}).fill("B");await page.getByRole("button",{name:"Subir parada 2"}).click();
    await page.getByRole("button",{name:"Guardar ruta",exact:true}).click();await page.waitForURL("**/portal/rutas/saved-route");
    await page.getByLabel("Nombre",{exact:true}).fill("Ruta desde UI revisada");await page.getByRole("button",{name:"Guardar ruta",exact:true}).click();await page.getByText("Guardado · revisión 2",{exact:true}).waitFor();
    assert.deepEqual(calls.map(call=>call.method),["POST","PATCH"]);assert.equal(calls[0].body.geometry.length,2);assert.deepEqual(calls[0].body.stops.map(stop=>stop.name),["B","A"]);assert.deepEqual(calls[0].body.stops.map(stop=>stop.order),[0,1]);
    await page.context().close();
  });
  await run("vehicle save network failure retains modal values and can retry successfully",async()=>{
    const page=await pageFor("company_portal");let failed=true;const vehicles=[];
    await page.route("**/api/vehicles",async route=>{
      if(route.request().method()==="POST"){
        if(failed)return route.abort();vehicles.push({...route.request().postDataJSON(),_id:"saved-vehicle",status:"active"});return route.fulfill({status:201,json:{vehicle:vehicles[0]}});
      }
      await route.fulfill({json:{vehicles}});
    });
    await page.goto(base+"/portal/unidades");await page.getByRole("button",{name:"+ Nueva unidad",exact:true}).click();const modal=page.getByRole("dialog",{name:"Nueva unidad"});
    await modal.getByLabel("Número económico").fill("QA-SAVE");await modal.getByRole("button",{name:"Agregar unidad",exact:true}).click();await modal.getByRole("alert").waitFor();
    assert.equal(await modal.getByLabel("Número económico").inputValue(),"QA-SAVE");failed=false;await modal.getByRole("button",{name:"Agregar unidad",exact:true}).click();await page.getByText("QA-SAVE",{exact:true}).waitFor();
    assert.equal(await modal.count(),0);await page.context().close();
  });
  await run("driver edit and incident create use existing endpoints with recovery",async()=>{
    const page=await pageFor("company_portal");let driver={_id:"ui-driver",name:"Driver original",email:"ui@example.test",active:true};const incidents=[];
    await page.route("**/api/drivers",route=>route.fulfill({json:{drivers:[driver]}}));
    await page.route("**/api/drivers/ui-driver",route=>{assert.equal(route.request().method(),"PATCH");driver={...driver,...route.request().postDataJSON()};return route.fulfill({json:{driver}})});
    await page.goto(base+"/portal/conductores");await page.getByRole("button",{name:"Editar conductor"}).click();const edit=page.getByRole("dialog",{name:"Editar conductor"});
    await edit.getByLabel("Nombre",{exact:true}).fill("Driver editado");await edit.getByRole("button",{name:"Guardar conductor"}).click();await page.locator(".driver-entity-table").getByText("Driver editado",{exact:true}).waitFor();
    await page.route("**/api/incidents",route=>{
      if(route.request().method()==="POST")incidents.push({...route.request().postDataJSON(),_id:"ui-incident",status:"open",createdAt:new Date().toISOString()});
      return route.fulfill({status:route.request().method()==="POST"?201:200,json:{incidents,incident:incidents[0]}});
    });
    await page.goto(base+"/portal/incidencias");await page.getByRole("button",{name:"Nueva incidencia",exact:true}).click();const create=page.getByRole("dialog",{name:"Nueva incidencia"});
    await create.getByLabel("Descripción").fill("Reporte UI persistido");await create.getByRole("button",{name:"Guardar incidencia",exact:true}).click();await page.getByText("Reporte UI persistido",{exact:true}).waitFor();
    assert.equal(incidents.length,1);await page.context().close();
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
    const page=await pageFor("company_portal");const ids=[],packets=[];
    const incoming={_id:"incoming",senderUserId:"other",channelId:"dispatch",kind:"text",body:"Realtime conservado",clientMessageId:"incoming-client",createdAt:new Date().toISOString()};
    await page.route("**/api/chat/users",route=>route.fulfill({json:{users:[{id:"other",name:"Otro conductor QA",channel:"mobile_operations",roles:["driver"]}]}}));
    await page.route("**/api/chat/messages?**",async route=>{await new Promise(resolve=>setTimeout(resolve,600));await route.fulfill({json:{messages:[]}})});
    await page.routeWebSocket("**/socket.io/**",ws=>{
      ws.send('0'+JSON.stringify({sid:"ui-qa",upgrades:[],pingInterval:25000,pingTimeout:20000,maxPayload:1000000}));
      ws.onMessage(raw=>{
        const frame=String(raw);
        if(frame==="40"){ws.send('40'+JSON.stringify({sid:"ui-qa-socket"}));return}
        const match=frame.match(/^42(\d*)(\[.*)$/);if(!match)return;
        const [event,payload]=JSON.parse(match[2]);
        if(event==="presence:join")ws.send('42'+JSON.stringify(["presence:snapshot",{onlineUserIds:["other"],timestamp:new Date().toISOString()}]));
        if(event==="chat:join")ws.send('42'+JSON.stringify(["chat:message",incoming]));
        if(event==="chat:message"){
          ids.push(payload.clientMessageId);
          packets.push(payload);
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
    await page.getByRole("button",{name:/Otro conductor QA/}).click();
    await page.getByRole("textbox",{name:"Mensaje",exact:true}).fill("Mensaje directo QA");await page.getByRole("button",{name:"Enviar",exact:true}).click();
    await page.getByText("Mensaje directo QA",{exact:true}).waitFor();
    assert.equal(packets.at(-1).recipientUserId,"other");assert.equal(packets.at(-1).channelId,"direct:other:ui-qa-user");
    await page.context().close();
  });
  if(process.env.QA_RESPONSIVE==="1"){
    const surfaces=[
      ["company_portal","/","sales"],["company_portal","/planes","plans"],["company_portal","/login","login"],["company_portal","/checkout/fleet-4","checkout"],
      ["company_portal","/portal/monitoreo","map"],["company_portal","/portal/dashboard","summary"],["company_portal","/portal/unidades","vehicles"],["company_portal","/portal/rutas/nueva","routes"],["company_portal","/portal/conductores","drivers"],["company_portal","/portal/documentos","documents"],["company_portal","/portal/incidencias","incidents"],["company_portal","/portal/facturacion","billing"],["company_portal","/portal/chat","chat"],["company_portal","/portal/radio","radio"],
      ["mobile_operations","/operacion#controles-jornada","operation"],["mobile_operations","/operacion/chat","operation-chat"],["mobile_operations","/operacion/alertas","operation-alerts"],
      ["platform_admin","/admin/empresas","admin-organizations"],["platform_admin","/admin/pagos-manuales","admin-payments"],["platform_admin","/admin/versiones","admin-versions"],["platform_admin","/admin/gobernanza","admin-audit"],["platform_admin","/admin/salud","admin-health"]
    ];
    await mkdir("artifacts/functional-ui-qa/screens",{recursive:true});
    for(const [channel,path,name] of surfaces){
      if(process.env.QA_RESPONSIVE_SURFACE&&process.env.QA_RESPONSIVE_SURFACE!==name)continue;
      const page=await pageFor(channel);
      await page.route("**/api/locations/live",route=>route.fulfill({json:{units:[unit]}}));
      await page.route("**/api/operation/navigation",route=>route.fulfill({json:{journey:{id:unit.journeyId,vehicleId:unit.vehicleId,state:"RUNNING",routeId:unit.routeId},route:{id:unit.routeId,name:unit.routeName,geometry:[],stops:[]},snapshot:unit}}));
      await page.route("**/api/journeys",route=>route.fulfill({json:{journeys:[{_id:unit.journeyId,vehicleId:unit.vehicleId,state:"RUNNING"}]}}));
      await page.route("**/api/account/subscription",route=>route.fulfill({json:{subscription:{planCode:"fleet-4",provider:"mercadopago",status:"active",vehicleLimit:4},canManageBilling:true}}));
      await page.route("**/api/health/ready",route=>route.fulfill({json:{status:"degraded",timestamp:new Date().toISOString(),database:{ok:true},redis:{ok:false},rtc:{ready:false},integrations:{mapbox:false},missing:["MAPBOX_TOKEN"]}}));
      await page.route("**/api/admin/metrics",route=>route.fulfill({json:{metrics:{timers:[]},summary:{socketsConnected:0,apiErrorRatePercent:0,apiErrors:0,apiRequests:0,queue:{waiting:0,delayed:0,active:0,failed:0,completed:0}}}}));
      await page.route("**/api/admin/organizations",route=>route.fulfill({json:{organizations:[{_id:"org",name:"Organización QA",slug:"organization-qa",status:"active",planCode:"fleet-4"}]}}));
      await page.route("**/api/documents/owners",route=>route.fulfill({json:{drivers:[],vehicles:[]}}));
      await page.goto(base+path);await page.waitForTimeout(250);
      if(process.env.QA_METRIC_TEXT_STRESS==="1")await page.addStyleTag({content:".entity-metrics small{font-size:12px}"});
      for(const theme of ["dark","light"]){for(const width of [360,390,430,768,1024,1366,1920]){
        await page.setViewportSize({width,height:900});await page.emulateMedia({reducedMotion:"reduce"});await page.evaluate(theme=>{document.documentElement.dataset.theme=theme},theme);
        if(name==="map"&&await page.getByRole("complementary",{name:"Detalle de QA-01"}).count()===0){const unitButton=page.getByRole("button",{name:/QA-01/});if(await unitButton.count())await unitButton.click()}
        const overflow=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,offscreen:Array.from(document.querySelectorAll("main *")).filter(node=>{const r=node.getBoundingClientRect(),s=getComputedStyle(node);return r.width>0&&r.right>innerWidth+1&&s.position!=="fixed"&&s.position!=="absolute"}).slice(0,5).map(node=>({tag:node.tagName,class:node.className}))}));
        const result=await new AxeBuilder({page}).analyze();const violations=result.violations.filter(item=>["serious","critical"].includes(item.impact)).map(item=>({id:item.id,nodes:item.nodes.map(node=>({target:node.target,reason:node.failureSummary}))}));
        if(overflow.scroll>width+1||violations.length){const failure={name,theme,width,overflow,violations};failures.push(failure);console.error(JSON.stringify(failure));}
        if(width===390||width===1366)await page.screenshot({path:`artifacts/functional-ui-qa/screens/${name}-${theme}-${width}.png`,fullPage:true});
        checks.push({name,theme,width,status:overflow.scroll<=width+1&&!violations.length?"PASS":"FAIL"});
      }}
      console.log("RESPONSIVE "+name+" 14 checks");await page.context().close();
    }
    assert.equal(failures.length,0,"Responsive/accessibility failures: "+failures.length);
  }
}finally{
  await browser.close();await mkdir("artifacts/functional-ui-qa",{recursive:true});
  await writeFile(process.env.QA_RESPONSIVE?(process.env.QA_METRIC_TEXT_STRESS?"artifacts/functional-ui-qa/responsive-text-stress-report.json":process.env.QA_RESPONSIVE_SURFACE?"artifacts/functional-ui-qa/responsive-focused-report.json":"artifacts/functional-ui-qa/responsive-report.json"):process.env.QA_MAPBOX?"artifacts/functional-ui-qa/mapbox-report.json":"artifacts/functional-ui-qa/report.json",JSON.stringify({generatedAt:new Date().toISOString(),checks,failures},null,2));
}
