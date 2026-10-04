import assert from 'node:assert/strict';

const labels={ASSIGNED:'Preparando jornada',READY:'Lista para iniciar',RUNNING:'En ruta',PAUSED:'Jornada pausada',FINISHED:'Jornada finalizada',CANCELLED:'Jornada cancelada'};
export async function operationMatrix(ctx,cell){
  function fixture(state='RUNNING',overrides={}){
    return {journey:{id:ctx.unit.journeyId,vehicleId:ctx.unit.vehicleId,state,routeId:ctx.unit.routeId,startedAt:null},route:{id:ctx.unit.routeId,name:'Ruta QA real de navegación',origin:'Origen QA',destination:'Destino QA',revision:1,geometry:[],stops:[{order:2,name:'Parada final QA',latitude:19.32,longitude:-98.22,radiusM:30},{order:1,name:ctx.unit.nextStop.name,latitude:19.31,longitude:-98.21,radiusM:0}]},snapshot:{...ctx.unit,recordedAt:new Date().toISOString(),routeState:'ON_ROUTE'},...overrides};
  }
  async function setup(state='RUNNING'){
    const page=await ctx.createPage(cell);let data=fixture(state),currentState=state,postMode='ok',release,posts=0,reads=0;
    await ctx.realtime(page);
    await page.route('**/api/locations/live',()=>{throw new Error('Driver cannot query portal live fleet')});
    await page.route('**/api/operation/navigation',r=>r.fulfill({json:data}));
    await page.route('**/api/journeys',async r=>{
      if(r.request().method()!=='POST'){reads++;return r.fulfill({json:{journeys:[{_id:ctx.unit.journeyId,vehicleId:ctx.unit.vehicleId,state:currentState}]}})}
      posts++;assert.equal(r.request().postDataJSON().journeyId,ctx.unit.journeyId);
      if(postMode==='held')await new Promise(resolve=>release=resolve);
      if(postMode==='error'||postMode==='held')return r.fulfill({status:503,json:{error:'La jornada no pudo actualizarse. '+('Detalle de la respuesta suministrada por QA. '.repeat(8))}});
      return r.fulfill({json:{journey:{_id:ctx.unit.journeyId,vehicleId:ctx.unit.vehicleId,state:currentState}}});
    });
    const shell={page,setData:value=>{data=value},setState:value=>{currentState=value;data=fixture(value)},setPostMode:value=>{postMode=value},release:()=>release?.(),held:()=>Boolean(release),posts:()=>posts,reads:()=>reads};
    return shell;
  }
  if(!process.env.QA_V3_FAMILY||process.env.QA_V3_FAMILY==='map'){
    const f=await setup(),{page}=f;f.setData({journey:null,route:null,snapshot:null});await page.goto(ctx.base+'/operacion');await page.getByText('Esperando jornada',{exact:true}).waitFor();
    assert.equal(await page.locator('.driver-map-canvas').count(),0);assert.equal(await page.locator('.unit-detail-panel').count(),0);
    await ctx.capture(page,cell,'map','zero-unit',['actual unassigned navigation response','zero map units','no portal detail/fleet query']);
    f.setData(fixture());await page.reload();await page.locator('.mobile-v3-next-stop strong').getByText(ctx.unit.nextStop.name,{exact:true}).waitFor();
    assert.equal(await page.locator('.driver-map-canvas').count(),1);assert.equal(await page.locator('.mobile-v3-map-identity strong').textContent(),ctx.unit.economicNumber);
    await page.getByText('El mapa no está disponible. Los datos de tu jornada siguen accesibles.',{exact:true}).waitFor();
    await ctx.capture(page,cell,'map','one-unit',['actual authorized single unit snapshot','one map owner','supplied next stop','missing-token fallback explicit; not real-provider evidence']);await ctx.close(page);
  }
  if(!process.env.QA_V3_FAMILY||process.env.QA_V3_FAMILY==='sheet'){
    const f=await setup(),{page}=f;await page.goto(ctx.base+'/operacion');const sheet=page.locator('#operation-context'),grip=sheet.getByRole('slider',{name:'Ajustar nivel del contexto'});await sheet.getByText(ctx.unit.nextStop.name,{exact:true}).waitFor();
    const heights=[];
    for(const [key,level]of [['Home','compact'],['ArrowUp','medium'],['ArrowUp','expanded']]){
      await grip.press(key);await ctx.settleVisualState(page);assert.equal(await sheet.getAttribute('data-level'),level);
      const geometry=await sheet.evaluate((n,level)=>({height:n.getBoundingClientRect().height,target:n.querySelector('[data-sheet-measure="'+level+'"]').getBoundingClientRect().height}),level);assert.ok(Math.abs(geometry.height-geometry.target)<=1);heights.push(geometry.height);await ctx.actionable(page,grip);
      await ctx.capture(page,cell,'sheet',level,['actual controlled '+level+' level','rendered target geometry <=1px','nonmodal44px grip reachable']);
    }
    assert.ok(heights[0]<heights[1]&&heights[1]<heights[2],'Three stages distinct');
    await grip.press('Home');await ctx.settleVisualState(page);
    const start=await grip.boundingBox(),initial=await sheet.evaluate(n=>n.getBoundingClientRect().height),medium=await sheet.locator('[data-sheet-measure="medium"]').evaluate(n=>n.getBoundingClientRect().height);
    await page.mouse.move(start.x+start.width/2,start.y+start.height/2);await page.mouse.down();await page.mouse.move(start.x+start.width/2,start.y+start.height/2-(medium-initial),{steps:4});
    assert.equal(await sheet.getAttribute('data-dragging'),'true');assert.equal(await grip.evaluate(n=>n.hasPointerCapture(1)),true);assert.equal(await sheet.getAttribute('data-level'),'compact');
    await ctx.capture(page,cell,'sheet','drag',['actual primary capture','drag from handle only','confirmed level unchanged while moving']);
    await page.mouse.up();await ctx.settleVisualState(page);assert.equal(await sheet.getAttribute('data-level'),'medium');
    await ctx.capture(page,cell,'sheet','snap',['actual pointerup snaps to rendered medium','capture released','confirmed level published']);
    async function begin(){await grip.press('Home');await ctx.settleVisualState(page);await ctx.actionable(page,grip);const r=await grip.boundingBox();await page.mouse.move(r.x+r.width/2,r.y+r.height/2);await page.mouse.down();await page.mouse.move(r.x+r.width/2,r.y+r.height/2-30);assert.equal(await sheet.getAttribute('data-dragging'),'true')}
    await begin();await grip.dispatchEvent('pointercancel',{pointerId:1,isPrimary:true,bubbles:true});await page.mouse.up();assert.equal(await sheet.getAttribute('data-dragging'),null);assert.equal(await sheet.getAttribute('data-level'),'compact');
    await ctx.capture(page,cell,'sheet','cancel-primary',['matching primary cancel restores compact','drag state cleared','no operational action']);
    await begin();for(const type of ['pointercancel','lostpointercapture']){await grip.dispatchEvent(type,{pointerId:2,isPrimary:false,bubbles:true});assert.equal(await sheet.getAttribute('data-dragging'),'true');assert.equal(await grip.evaluate(n=>n.hasPointerCapture(1)),true)}
    const secondaryRow=await ctx.capture(page,cell,'sheet','cancel-secondary',['secondary pointercancel ignored','secondary lostpointercapture ignored','actual primary capture and drag retained','browser event probe; not physical multitouch']);
    await grip.dispatchEvent('pointercancel',{pointerId:1,isPrimary:true,bubbles:true});await page.mouse.up();assert.equal(await sheet.getAttribute('data-dragging'),null);secondaryRow.assertions.push('matching primary cancellation still clears drag');
    for(const [key,level]of [['Home','compact'],['ArrowUp','medium'],['End','expanded'],['ArrowDown','medium'],['Escape','compact']]){await grip.press(key);assert.equal(await sheet.getAttribute('data-level'),level)}
    await ctx.capture(page,cell,'sheet','keyboard',['actual Home/End/arrows/contextual Escape','grip keeps keyboard focus']);
    // Change only the isolated read response; checklist authority remains actual.
    f.setState('ASSIGNED');await page.goto(ctx.base+'/operacion#controles-jornada');await page.reload();const input=page.getByLabel('Odómetro inicial (km)');await input.fill('123.4');await input.focus();await ctx.actionable(page,input);
    await ctx.capture(page,cell,'sheet','focus',['actual checklist field focused/reachable','single mounted JourneyPanel','draft retained']);
    await grip.press('Home');assert.equal(await grip.evaluate(n=>n===document.activeElement),true);await grip.press('End');assert.equal(await input.inputValue(),'123.4');
    const longName='Próxima parada suministrada con nombre muy largo para verificar wrapping y lectura. '.repeat(10);f.setData(fixture('ASSIGNED',{snapshot:{...fixture('ASSIGNED').snapshot,nextStop:{...ctx.unit.nextStop,name:longName}}}));await page.reload();await page.locator('.mobile-v3-next-stop strong').getByText(longName,{exact:true}).waitFor();await grip.press('End');
    const longStop=sheet.locator('.mobile-v3-next-stop strong');await longStop.evaluate(n=>n.scrollIntoView({block:'center',behavior:'instant'}));await ctx.settleVisualState(page);
    assert.equal(await longStop.textContent(),longName);assert.ok(await sheet.locator('.mobile-v3-sheet-body').evaluate(n=>n.getBoundingClientRect().height>=44));
    await ctx.capture(page,cell,'sheet','long-content',['actual long supplied next stop wraps','expanded body remains >=44px','independent sheet scroll']);
    const tools=page.locator('#controles-jornada');await tools.evaluate(n=>{n.open=true});await page.getByLabel('Odómetro inicial (km)').fill('123.4');const confirm=page.getByRole('button',{name:'Confirmar checklist',exact:true});await ctx.actionable(page,confirm);
    assert.ok(await sheet.evaluate(n=>n.scrollTop>0||n.querySelector('.mobile-v3-sheet-body').scrollTop>0));assert.equal(f.posts(),0);
    await ctx.capture(page,cell,'sheet','body-scroll',['actual independent content scroll','existing action44px/full viewport/center hit','no submitted journey action']);await ctx.close(page);
  }
  if(!process.env.QA_V3_FAMILY||process.env.QA_V3_FAMILY==='journey'){
    const f=await setup(),{page}=f;
    for(const [state,label]of Object.entries(labels)){
      f.setState(state);await page.goto(ctx.base+'/operacion#controles-jornada');await page.reload();await page.locator('.mobile-v3-journey-panel .badge').getByText(label,{exact:true}).waitFor();
      const panel=page.locator('.mobile-v3-journey-panel');assert.equal(await panel.count(),1);
      const allowed=state==='ASSIGNED'?['Confirmar checklist']:state==='READY'?['Iniciar jornada']:state==='RUNNING'?['Pausar','Finalizar']:state==='PAUSED'?['Reanudar','Finalizar']:[];
      assert.equal(await panel.locator('button').count(),allowed.length);for(const name of allowed)await ctx.actionable(page,panel.getByRole('button',{name,exact:true}));
      await ctx.capture(page,cell,'journey',state,['actual confirmed GET journey '+state,'localized supplied state','only existing allowed action set','single JourneyPanel']);
    }
    f.setState('READY');f.setPostMode('held');await page.goto(ctx.base+'/operacion#controles-jornada');await page.reload();const start=page.getByRole('button',{name:'Iniciar jornada',exact:true});await ctx.actionable(page,start);await start.click();await ctx.wait(f.held);await page.getByText('Actualizando jornada…',{exact:true}).waitFor();
    assert.equal(await page.locator('.mobile-v3-journey-panel fieldset').evaluate(n=>n.disabled),true);assert.equal(await start.isDisabled(),true);assert.equal(f.posts(),1);
    await ctx.capture(page,cell,'journey','busy',['actual held start POST','busy disables fieldset','single action request','server READY not optimistically RUNNING']);
    f.release();await page.locator('.mobile-v3-journey-panel').getByRole('alert').waitFor();assert.equal(await start.isEnabled(),true);assert.equal(await page.locator('.mobile-v3-journey-panel .badge').textContent(),'Lista para iniciar');await ctx.actionable(page,start);
    await ctx.capture(page,cell,'journey','error',['actual503 action response','confirmed READY retained','error visible','start retry44px reachable']);
    f.setState('RUNNING');f.setPostMode('ok');await page.goto(ctx.base+'/operacion#controles-jornada');await page.reload();await page.getByRole('button',{name:'Pausar',exact:true}).waitFor();
    const selectors='.mobile-v3-map-summary :is(strong,small,span),.mobile-v3-map-detail :is(strong,small,p,span),.mobile-v3-journey-panel :is(strong,span,button),#controles-jornada>summary :is(span,small)';
    const sizes=await page.locator(selectors).evaluateAll(nodes=>nodes.map(n=>({node:n,size:parseFloat(getComputedStyle(n).fontSize)})).map(({node,size})=>{node.dataset.qaOriginalFont=String(size);return size}));assert.ok(sizes.length>=15);
    await page.locator(selectors).evaluateAll(nodes=>nodes.forEach(n=>n.style.setProperty('font-size',Number(n.dataset.qaOriginalFont)*2+'px','important')));
    await ctx.settleVisualState(page);const doubled=await page.locator(selectors).evaluateAll(nodes=>nodes.every(n=>Math.abs(parseFloat(getComputedStyle(n).fontSize)-Number(n.dataset.qaOriginalFont)*2)<.1));assert.equal(doubled,true,'Actual operation text200percent');
    const stop=page.locator('.mobile-v3-next-stop strong');await stop.evaluate(n=>n.scrollIntoView({block:'center',behavior:'instant'}));assert.equal(await stop.textContent(),ctx.unit.nextStop.name);
    const stopRow=await ctx.capture(page,cell,'journey','actual-text-200-percent',['actual operation summary/status/metrics/actions fonts doubled','supplied next stop readable','no Foundation substitute','human3s reading remains pending']);
    for(const name of ['Pausar','Finalizar'])await ctx.actionable(page,page.getByRole('button',{name,exact:true}));assert.equal(f.posts(),1);stopRow.assertions.push('actual existing action targets reachable at200percent; no new action');
    await ctx.capture(page,cell,'journey','actual-action-reachability',['actual200percent Pausar/Finalizar targets >=44px','full viewport/center hit after scroll','no additional POST']);await ctx.close(page);
  }
  if(!process.env.QA_V3_FAMILY||process.env.QA_V3_FAMILY==='route'){
    const f=await setup(),{page}=f;
    for(const state of ['full','partial','null-ETA','zero-distance','no-next-stop','off-route-existing']){
      const data=fixture();if(state==='partial')data.route={id:ctx.unit.routeId,name:'Ruta parcial QA',revision:0,geometry:[],stops:[]};
      if(state==='null-ETA')data.snapshot.etaMinutes=null;if(state==='zero-distance'){data.snapshot.distanceRemainingM=0;data.snapshot.nextStop={...data.snapshot.nextStop,distanceRemainingM:0}}
      if(state==='no-next-stop')data.snapshot.nextStop=null;if(state==='off-route-existing'){data.snapshot.isOffRoute=true;data.snapshot.routeState='OFF_ROUTE_CONFIRMED';data.snapshot.distanceFromRouteM=125}
      f.setData(data);await page.goto(ctx.base+'/operacion/navegacion');const content=page.locator('.mobile-v3-route-context');await content.waitFor();
      if(state==='full'){assert.deepEqual(await content.locator('.mobile-v3-route-stop [aria-current="step"]').allTextContents(),['2. '+ctx.unit.nextStop.name]);assert.equal(await content.getByText('Revisión 1',{exact:true}).count(),1)}
      if(state==='partial'){await content.getByText('Origen no disponible → Destino no disponible',{exact:true}).waitFor();assert.equal(await content.locator('.mobile-v3-route-stop').count(),0)}
      if(state==='null-ETA')await content.getByText('Sin estimación',{exact:true}).waitFor();
      if(state==='zero-distance')await content.getByText('0 m restantes',{exact:true}).waitFor();
      if(state==='no-next-stop')await content.getByText('Sin siguiente parada proyectada',{exact:true}).waitFor();
      if(state==='off-route-existing')await content.getByText('Fuera de ruta',{exact:true}).waitFor();
      assert.equal(await page.locator('.unit-detail-panel').count(),0);
      await ctx.capture(page,cell,'route',state,['actual supplied route/snapshot '+state,'null and zero preserved','no visited-stop/history metric invented','existing driver navigation only']);
    }
    await ctx.close(page);
  }
}
