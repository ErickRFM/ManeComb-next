import assert from 'node:assert/strict';

// Complete server-shaped QA failures deliberately exercise each rendered field.
const longError='No se pudo completar la solicitud. '+('Detalle operativo suministrado para comprobar mensajes largos y acceso a los controles. '.repeat(18));
const password='QA-valid-password-123';
const forms=[
  {prefix:'',path:'/login?surface=operation',api:'login',field:'Correo',value:'qa@example.test',button:'Iniciar sesión',payload:{email:'qa@example.test',password}},
  {prefix:'activation-',path:'/activar?surface=operation',api:'activate',field:'Llave de activación',value:'QA-ONLY-KEY',button:'Activar dispositivo',payload:{code:'QA-ONLY-KEY'}},
  {prefix:'recovery-',path:'/recuperar-password?surface=operation',api:'recover',field:'Correo electrónico',value:'qa@example.test',button:'Enviar enlace',payload:{email:'qa@example.test'}},
  {prefix:'reset-',path:'/restablecer-password?token=ui-qa&surface=operation',api:'reset-password',field:'Nueva contraseña',value:password,button:'Cambiar contraseña',payload:{token:'ui-qa',password}},
  {prefix:'mfa-',path:'/mfa?surface=operation',api:'mfa/verify',field:'Código de verificación',value:'123456',button:'Verificar',payload:{code:'123456'}}
];

export async function authMatrix(ctx,cell){
  for(const item of forms){
    const page=await ctx.createPage(cell,item.prefix==='mfa-'?'platform_admin':'mobile_operations');let calls=0,release;
    await page.route('**/api/auth/mfa/setup',r=>r.fulfill({status:409,json:{error:'ALREADY_CONFIGURED'}}));
    await page.route('**/api/auth/'+item.api,async route=>{
      calls++;assert.equal(route.request().method(),'POST');assert.deepEqual(route.request().postDataJSON(),item.payload);
      await new Promise(resolve=>release=resolve);await route.fulfill({status:503,json:{error:longError,message:longError}});
    });
    await page.goto(ctx.base+item.path);const shell=page.locator('.operation-auth-shell');await shell.waitFor();
    if(item.prefix==='mfa-')await page.getByText('Ingresa el código de tu autenticador.',{exact:true}).waitFor();
    await page.waitForFunction(()=>{const node=document.querySelector('.operation-auth-shell form');return node&&Object.keys(node).some(key=>key.startsWith('__reactProps$')&&typeof node[key]?.onSubmit==='function')});
    assert.equal(await page.locator('.auth-premium-shell,.portal-shell,.admin-shell').count(),0,'Operation access remains separated');
    assert.equal(await shell.locator('form').count(),1);assert.equal(await page.locator('input[name="organizationName"]').count(),0);
    const submit=()=>shell.getByRole('button',{name:item.button,exact:true});await ctx.actionable(page,submit());
    await ctx.capture(page,cell,'auth',item.prefix+'default',['actual operation access page','single form','commercial surfaces absent','44px reachable actual CTA']);
    const field=page.getByLabel(item.field,{exact:true});await field.fill(item.value);
    if(!item.prefix)await page.getByLabel('Contraseña',{exact:true}).fill(password);
    if(item.prefix==='reset-')await page.getByLabel('Confirmar contraseña',{exact:true}).fill(password);
    await field.focus();assert.equal(await field.evaluate(n=>n===document.activeElement),true);
    await ctx.actionable(page,field);
    if(!item.prefix)await ctx.capture(page,cell,'auth','focus',['actual email focus','typed credentials retained','44px focus target reachable']);
    await ctx.actionable(page,submit());await submit().click();
    await page.waitForFunction(()=>document.querySelector('.operation-auth-shell form')?.getAttribute('aria-busy')==='true');
    await ctx.wait(()=>Boolean(release),'Actual auth POST held');assert.equal(calls,1);assert.equal(await field.inputValue(),item.value);
    assert.equal(await shell.locator('button[type="submit"],form>.btn').isDisabled(),true);
    await ctx.capture(page,cell,'auth',item.prefix?item.prefix+'pending':'loading',['actual held POST','aria-busy true','submit disabled','one request','input retained','existing request payload unchanged']);
    release();const alert=shell.getByRole('alert');await alert.waitFor();assert.equal(await alert.textContent(),longError);
    assert.equal(await field.inputValue(),item.value);assert.equal(calls,1);assert.equal(await submit().isEnabled(),true);
    await submit().focus();await ctx.actionable(page,submit());
    await ctx.capture(page,cell,'auth',item.prefix?item.prefix+'error':'error-long',['actual long server-rendered error field','input retained','single POST','retry CTA enabled','44px CTA full viewport and center hit after long error']);
    await ctx.close(page);
  }
  const page=await ctx.createPage(cell);let calls=0,release;
  await page.route('**/api/auth/session',async route=>{calls++;await new Promise(resolve=>release=resolve);await route.fulfill({status:calls===1?503:401,json:{error:calls===1?'UNAVAILABLE':'UNAUTHENTICATED'}})});
  await page.goto(ctx.base+'/app');await page.getByText('Comprobando tu sesión operativa…',{exact:true}).waitFor();await ctx.wait(()=>Boolean(release));
  assert.equal(await page.locator('.operation-session-check').getAttribute('aria-busy'),'true');
  await ctx.capture(page,cell,'auth','bootstrap-loading',['actual OperationEntry held session request','loading aria-busy','no artificial minimum session delay']);
  release();await page.locator('.operation-session-check').getByRole('alert').waitFor();
  const retry=page.getByRole('button',{name:'Reintentar',exact:true});await ctx.actionable(page,retry);
  await ctx.capture(page,cell,'auth','bootstrap-error',['actual session503 error','existing44px retry reachable']);
  release=null;await retry.click();await ctx.wait(()=>Boolean(release));assert.ok(calls>=2);await page.getByText('Comprobando tu sesión operativa…',{exact:true}).waitFor();
  const row=await ctx.capture(page,cell,'auth','bootstrap-retry',['actual retry clears error','new held session request','existing loading retained']);
  release();await page.waitForURL('**/login?surface=operation');row.assertions.push('actual401 redirect to operational login');await ctx.close(page);
}
