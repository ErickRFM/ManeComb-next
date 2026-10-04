import assert from 'node:assert/strict';

export async function alertsMoreMatrix(ctx,cell){
  const page=await ctx.createPage(cell);await ctx.realtime(page);
  await page.route('**/api/operation/navigation',r=>r.fulfill({json:{journey:{id:ctx.unit.journeyId,vehicleId:ctx.unit.vehicleId,state:'RUNNING',routeId:ctx.unit.routeId},route:{id:ctx.unit.routeId,name:ctx.unit.routeName,revision:1,geometry:[],stops:[]},snapshot:ctx.unit}}));
  await page.route('**/api/journeys',r=>r.fulfill({json:{journeys:[{_id:ctx.unit.journeyId,vehicleId:ctx.unit.vehicleId,state:'RUNNING'}]}}));
  if(!process.env.QA_V3_FAMILY||process.env.QA_V3_FAMILY==='alerts'){
    const reports=['critical','high','medium','low','future'].map((severity,i)=>({_id:String(i),severity,type:i===0?'sos':'mechanical',status:'open',message:'Reporte suministrado '+i+' '+('Descripción extensa de la incidencia. '.repeat(12)),createdAt:'2026-10-03T20:00:00.000Z'}));
    reports.push({_id:'missing',message:'Reporte incompleto suministrado a QA'});let response=reports,failed=false;
    await page.route('**/api/incidents',r=>r.fulfill({status:failed?503:200,json:failed?{error:'UNAVAILABLE'}:{incidents:response}}));
    await page.goto(ctx.base+'/operacion/alertas');await page.getByText(reports[0].message,{exact:true}).waitFor();
    for(const [state,heading,index]of [['critical','Críticas',0],['high','Críticas',1],['medium','Operativas',2],['low','Informativas',3],['unknown','Reportes',4],['missing-fields','Reportes',5]]){
      const item=page.getByRole('region',{name:heading,exact:true}).locator('article').filter({hasText:reports[index].message});assert.equal(await item.count(),1);await item.evaluate(n=>n.scrollIntoView({block:'center',behavior:'instant'}));
      if(state==='missing-fields'){await item.getByText('Tipo no disponible',{exact:true}).waitFor();await item.getByText('Estado no disponible',{exact:true}).waitFor();await item.getByText('Fecha no disponible',{exact:true}).waitFor();assert.equal(await item.locator('time').count(),0)}
      assert.equal(await page.getByText(/GPS perdido|GPS recuperado|checkpoint|ruta actualizada/i).count(),0);
      await ctx.capture(page,cell,'alerts',state,['actual supplied incident in '+heading,'actual message retained','only supplied date/type/status; missing fields honest','no Event Engine feed invented']);
    }
    failed=true;await ctx.actionable(page,page.getByRole('button',{name:'Actualizar',exact:true}));await page.getByRole('button',{name:'Actualizar',exact:true}).click();await page.locator('.mobile-v3-alerts').getByRole('alert').waitFor();assert.equal(await page.locator('article').count(),6);
    await ctx.capture(page,cell,'alerts','error-retained',['actual503 refresh','six supplied reports retained','recoverable existing refresh']);
    failed=false;response=[];await page.getByRole('button',{name:'Actualizar',exact:true}).click();await page.getByText('Sin alertas reportadas',{exact:true}).waitFor();assert.equal(await page.locator('article').count(),0);
    await ctx.capture(page,cell,'alerts','empty',['actual empty response','no invented report']);
  }
  if(!process.env.QA_V3_FAMILY||process.env.QA_V3_FAMILY==='more'){
    const more=async()=>{await page.goto(ctx.base+'/operacion/mas');for(const name of ['Operación','Emergencia','Sesión'])await page.getByRole('heading',{name,exact:true}).waitFor();assert.equal(await page.locator('a[href*="perfil"],a[href*="ticket"],a[href*="storage"],a[href*="documento"]').count(),0);assert.equal(await page.getByRole('button',{name:'Cerrar sesión',exact:true}).count(),1)};
    await more();const journey=page.getByRole('link',{name:'Controles de jornada y GPS',exact:true});await ctx.actionable(page,journey);await journey.click();await page.locator('#controles-jornada[open]').waitFor();assert.equal(await page.locator('#controles-jornada').count(),1);assert.equal(await page.locator('.mobile-v3-journey-panel').count(),1);
    await ctx.capture(page,cell,'more','journey-GPS',['actual existing journey/GPS destination','one mounted tools/JourneyPanel owner','no GPS-ready claim']);
    await more();const route=page.getByRole('link',{name:'Ruta, paradas y avance',exact:true});await ctx.actionable(page,route);await route.click();await page.locator('.mobile-v3-route-context').waitFor();
    await ctx.capture(page,cell,'more','route',['actual existing route destination','supplied route only']);
    await more();const theme=page.getByRole('button',{name:/Usar tema/});assert.equal(await theme.count(),1);await ctx.actionable(page,theme);await theme.click();assert.equal(await page.evaluate(()=>document.documentElement.dataset.theme),cell.theme==='dark'?'light':'dark');await theme.click();assert.equal(await page.evaluate(()=>localStorage.getItem('manecomb.theme')),cell.theme);
    await ctx.capture(page,cell,'more','theme-single-owner',['single existing ThemeToggle','actual toggle and storage','original cell theme restored']);
    await page.goto(ctx.base+'/operacion#controles-jornada');await page.locator('#controles-jornada[open]').waitFor();const push=page.getByRole('button',{name:'Activar',exact:true});assert.equal(await push.count(),1);await ctx.actionable(page,push);await push.click();await page.getByText(/Web Push no está configurado|Este dispositivo no soporta Web Push|Permiso de notificaciones no concedido/).waitFor();assert.equal(await page.getByText('Notificaciones activadas',{exact:true}).count(),0);
    await ctx.capture(page,cell,'more','push-single-existing-owner',['single existing PushOptIn reached through tools','actual unconfigured/unsupported/denied state','no granted permission or activated claim']);
    await more();let sosPosts=0;await page.route('**/api/incidents',r=>{assert.equal(r.request().method(),'POST');assert.deepEqual(r.request().postDataJSON(),{type:'sos',message:'SOS desde operación móvil'});sosPosts++;return r.fulfill({json:{ok:true}})});
    const sosLink=page.locator('.mobile-v3-more').getByRole('link',{name:'Reportar emergencia SOS',exact:true});await ctx.actionable(page,sosLink);await sosLink.click();const sos=page.getByRole('button',{name:'SOS',exact:true});await ctx.actionable(page,sos);await sos.click();await page.getByText('SOS enviado sin ubicación',{exact:true}).waitFor({timeout:15000});assert.equal(sosPosts,1);
    await ctx.capture(page,cell,'more','SOS',['actual existing SOS destination/action','single exact existing POST without coordinates','no geolocation grant; physical SOS pending']);
    await more();let logoutPosts=0;await page.route('**/api/auth/logout',r=>{assert.equal(r.request().method(),'POST');logoutPosts++;return r.fulfill({json:{ok:true},headers:{'set-cookie':'manecomb_session=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax'}})});const logout=page.getByRole('button',{name:'Cerrar sesión',exact:true});await ctx.actionable(page,logout);await logout.click();await page.waitForURL('**/login?surface=operation');assert.equal(logoutPosts,1);
    await ctx.capture(page,cell,'more','logout',['single actual logout POST','actual operational access redirect','no fake account destination']);
  }
  await ctx.close(page);
}
