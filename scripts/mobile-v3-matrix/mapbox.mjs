import assert from 'node:assert/strict';

export async function mapboxMatrix(ctx,cell){
  async function setup(failure=false){
    const page=await ctx.createPage(cell);await ctx.realtime(page);
    await page.route('**/api/operation/navigation',r=>r.fulfill({json:{journey:{id:ctx.unit.journeyId,vehicleId:ctx.unit.vehicleId,state:'RUNNING',routeId:ctx.unit.routeId},route:{id:ctx.unit.routeId,name:ctx.unit.routeName,revision:1,geometry:[{latitude:19.3,longitude:-98.2},{latitude:19.31,longitude:-98.21}],stops:[]},snapshot:{...ctx.unit,recordedAt:new Date().toISOString()}}}));
    await page.route('**/api/journeys',r=>r.fulfill({json:{journeys:[{_id:ctx.unit.journeyId,vehicleId:ctx.unit.vehicleId,state:'RUNNING'}]}}));
    if(failure)await page.route('https://api.mapbox.com/styles/v1/**',r=>r.fulfill({status:503,json:{message:'Controlled provider failure for isolated QA'}}));
    const provider=[],bodies=[];
    page.on('response',r=>{if(!new URL(r.url()).hostname.endsWith('mapbox.com'))return;const item={path:new URL(r.url()).pathname,status:r.status()};provider.push(item);if(item.status===404&&/^\/v4\/mapbox\.mapbox-incidents-v1\/\d+\/\d+\/\d+\.vector\.pbf$/.test(item.path))bodies.push(r.json().then(body=>item.message=body.message).catch(()=>{}))});
    await page.goto(ctx.base+'/operacion');await page.locator('.mobile-v3-next-stop strong').getByText(ctx.unit.nextStop.name,{exact:true}).waitFor();return {page,provider,bodies};
  }
  const f=await setup(),{page}=f;await ctx.realMapForQa(page,'.driver-map-canvas');
  await page.waitForFunction(()=>window.__qaLiveMap.queryRenderedFeatures().some(f=>f.layer?.source!=='manecomb-route'),{},{timeout:30000});
  assert.equal(await page.locator('.driver-map-canvas canvas').count(),1);assert.ok(await page.evaluate(()=>Boolean(window.__qaLiveMap.getSource('manecomb-route'))));
  await ctx.settleVisualState(page);
  const assertions=['SDK style loaded','basemap rendered features','single actual map canvas','actual supplied route source'];
  for(const target of await page.locator('.driver-follow,.mapboxgl-ctrl-group button').all())await ctx.actionable(page,target);
  await ctx.capture(page,cell,'map','provider-real',assertions,{provider:'Mapbox real'});
  await page.evaluate(()=>{const map=window.__qaLiveMap,original=map.easeTo;window.__qaCamera=[];map.easeTo=function(options,...rest){window.__qaCamera.push(options.duration);return original.call(this,options,...rest)}});
  const before=await page.evaluate(()=>window.__qaLiveMap.getCenter().toArray());
  const area=await page.evaluate(()=>{const canvas=document.querySelector('.driver-map-canvas canvas'),map=canvas.getBoundingClientRect(),sheet=document.querySelector('#operation-context').getBoundingClientRect(),bar=document.querySelector('.mobile-v3-top-bar').getBoundingClientRect(),top=Math.max(map.top,bar.bottom),bottom=Math.min(map.bottom,sheet.top);for(let y=top+8;y<bottom-10;y+=8)for(let x=map.left+60;x<map.right-100;x+=30)if(document.elementFromPoint(x,y)===canvas&&document.elementFromPoint(x+50,y+8)===canvas)return{x,y,available:bottom-top,hit:true};return{available:bottom-top,hit:false}});assert.ok(area.available>=44&&area.hit,'Unoccluded actual canvas drag area');
  await page.mouse.move(area.x,area.y);await page.mouse.down();await page.mouse.move(area.x+50,area.y+8,{steps:8});await page.mouse.up();
  await page.getByRole('button',{name:/Seguir/}).waitFor();assert.notDeepEqual(await page.evaluate(()=>window.__qaLiveMap.getCenter().toArray()),before);
  await ctx.capture(page,cell,'map','manual-camera',[...assertions,'actual SDK drag changes camera','follow disabled by real dragstart'],{provider:'Mapbox real'});
  const follow=page.getByRole('button',{name:/Seguir/});await ctx.actionable(page,follow);await follow.click();await page.waitForFunction(()=>window.__qaCamera.length>0);await page.waitForFunction(()=>{const c=window.__qaLiveMap.getCenter();return Math.abs(c.lng+98.2)<.00001&&Math.abs(c.lat-19.3)<.00001});
  await ctx.capture(page,cell,'map','recenter',[...assertions,'actual follow click recenters supplied unit','actual center coordinates'],{provider:'Mapbox real'});
  assert.equal(await page.evaluate(()=>window.__qaCamera.at(-1)),cell.motion==='reduce'?0:420);
  await ctx.capture(page,cell,'map','motion-policy',[...assertions,'actual easeTo duration '+(cell.motion==='reduce'?0:420)+'ms','instrumentation preserves SDK implementation'],{provider:'Mapbox real'});
  await Promise.all(f.bodies);const missing=f.provider.filter(r=>r.status===404&&r.message==='Tile not found'&&/^\/v4\/mapbox\.mapbox-incidents-v1\/\d+\/\d+\/\d+\.vector\.pbf$/.test(r.path));assert.deepEqual(f.provider.filter(r=>r.status>=400&&!r.path.startsWith('/events/')&&!missing.includes(r)),[],'Unexpected real provider HTTP error');assert.equal(await page.getByText(/No se pudo cargar el mapa|El mapa no está disponible/).count(),0);await ctx.close(page);
  const rejected=await setup(true);await rejected.page.getByText('No se pudo cargar el mapa. Revisa tu conexión.',{exact:true}).waitFor();assert.equal(await rejected.page.locator('.driver-map-canvas').count(),1);assert.equal(await rejected.page.locator('.mobile-v3-next-stop strong').textContent(),ctx.unit.nextStop.name);
  await ctx.capture(rejected.page,cell,'map','provider-failure',['actual SDK receives isolated503 style response','existing fallback visible','supplied operation data retained','single map owner; no real outage claim'],{provider:'Mapbox controlled HTTP failure'});await ctx.close(rejected.page);
}
