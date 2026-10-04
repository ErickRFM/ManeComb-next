import assert from 'node:assert/strict';

const person={id:'other',name:'Persona QA con nombre suministrado',channel:'mobile_operations',roles:['driver']};
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64');
async function socketHarness(page,onEvent,onOpen=()=>{}){
  await page.routeWebSocket('**/socket.io/**',ws=>{
    onOpen(ws);
    ws.send('0'+JSON.stringify({sid:'matrix-'+Date.now(),upgrades:[],pingInterval:25000,pingTimeout:20000,maxPayload:1000000}));
    ws.onMessage(raw=>{const frame=String(raw);if(frame==='40'){ws.send('40'+JSON.stringify({sid:'matrix-socket'}));return}if(frame==='2'){ws.send('3');return}const match=frame.match(/^42(\d*)(\[.*)$/);if(!match)return;
      const [event,payload]=JSON.parse(match[2]),ack=value=>{if(match[1])ws.send('43'+match[1]+JSON.stringify([value]))};
      onEvent({event,payload,ack,ws});
    });
  });
}

export async function communicationsMatrix(ctx,cell){
  if(!process.env.QA_V3_FAMILY||process.env.QA_V3_FAMILY==='chat')await chat(ctx,cell);
  if(!process.env.QA_V3_FAMILY||process.env.QA_V3_FAMILY==='radio')await radio(ctx,cell);
  if(!process.env.QA_V3_FAMILY||process.env.QA_V3_FAMILY==='rtc')await rtc(ctx,cell);
}

async function chat(ctx,cell){
  const page=await ctx.createPage(cell),packets=[];let held;
  await page.route('**/api/chat/users',r=>r.fulfill({json:{users:[person]}}));
  await page.route('**/api/chat/messages?**',r=>r.fulfill({json:{messages:[]}}));
  await page.route('**/api/uploads/cloudinary/signature',r=>{assert.deepEqual(r.request().postDataJSON(),{kind:'chat'});return r.fulfill({json:{apiKey:'qa',timestamp:1,folder:'qa',signature:'qa',cloudName:'qa',allowedFormats:'png',type:'authenticated'}})});
  await page.route('https://api.cloudinary.com/**',r=>r.fulfill({json:{secure_url:'https://example.invalid/qa.png',public_id:'qa-image',resource_type:'image',bytes:png.length}}));
  await page.route('**/api/chat/messages/*/attachment',r=>r.fulfill({body:png,contentType:'image/png'}));
  await socketHarness(page,({event,payload,ack,ws})=>{
    if(event==='presence:join')ws.send('42'+JSON.stringify(['presence:snapshot',{onlineUserIds:[person.id],timestamp:new Date().toISOString()}]));
    if(event==='chat:message'){packets.push(payload);held=ok=>ack(ok?{ok:true,message:{...payload,_id:'saved-'+packets.length,senderUserId:'ui-qa-user',createdAt:new Date().toISOString()}}:{ok:false,error:'QA_REJECTED'})}
    else ack({ok:true});
  });
  await page.goto(ctx.base+'/operacion/chat');const choose=page.getByRole('button',{name:new RegExp(person.name)});await choose.waitFor();
  await ctx.actionable(page,choose);await choose.click();await page.waitForFunction(()=>document.querySelector('[role="log"]')?.getAttribute('aria-busy')==='false');
  assert.equal(await page.locator('.message-bubble').count(),0);assert.equal(await page.locator('.chat-directory-head strong').textContent(),'Directorio');
  await ctx.capture(page,cell,'chat','empty',['actual empty history','real directory not inbox','no lastMessage/unread invented']);
  await page.getByText('Comienza la conversación',{exact:true}).waitFor();
  await ctx.capture(page,cell,'chat','conversation',['actual selected person/title','direct conversation chosen by existing callback','empty history preserved']);
  const composer=page.getByRole('textbox',{name:'Mensaje',exact:true});await composer.fill('Borrador real retenido de QA');await ctx.actionable(page,composer);
  await ctx.capture(page,cell,'chat','draft',['actual controlled draft','existing composer44px/viewport/center hit']);
  const send=page.getByRole('button',{name:'Enviar',exact:true});await ctx.actionable(page,send);await send.click();await ctx.wait(()=>Boolean(held));await page.getByText('Enviando…',{exact:true}).waitFor();
  assert.equal(packets.length,1);assert.equal(packets[0].recipientUserId,person.id);assert.equal(packets[0].channelId,'direct:other:ui-qa-user');assert.ok(packets[0].clientMessageId);assert.equal(await composer.inputValue(),'');
  await ctx.capture(page,cell,'chat','pending',['actual Socket.IO message ACK held','sending bubble','one clientMessageId','original recipient/channel retained']);
  held(false);await page.getByText('Envío sin confirmar',{exact:true}).waitFor();const retry=page.getByRole('button',{name:'Reintentar envío',exact:true});await ctx.actionable(page,retry);
  await ctx.capture(page,cell,'chat','failure',['actual rejected ACK','unconfirmed bubble','retry44px/viewport/center hit']);
  const id=packets[0].clientMessageId;held=null;await retry.click();await ctx.wait(()=>Boolean(held));assert.equal(packets.length,2);assert.equal(packets[1].clientMessageId,id);held(true);await page.getByText('Envío sin confirmar',{exact:true}).waitFor({state:'detached'});await page.getByText('Enviando…',{exact:true}).waitFor({state:'detached'});
  await ctx.capture(page,cell,'chat','retry-same-id',['actual retry reuses same clientMessageId','positive ACK removes pending','single saved message']);
  assert.equal(await page.locator('.message-bubble').count(),1);
  await ctx.capture(page,cell,'chat','send',['actual confirmed sent bubble','timestamp supplied by ACK','existing protocol and delivery callbacks']);
  held=null;await page.locator('input[type="file"]').setInputFiles({name:'qa.png',mimeType:'image/png',buffer:png});await ctx.wait(()=>Boolean(held));assert.equal(packets.at(-1).kind,'image');assert.equal(packets.at(-1).attachment.mimeType,'image/png');assert.equal(packets.at(-1).recipientUserId,person.id);held(true);
  const image=page.getByRole('img',{name:'Adjunto del chat',exact:true});await image.waitFor();await page.waitForFunction(()=>document.querySelector('.message-image')?.complete);assert.ok(await image.evaluate(n=>n.naturalWidth>0));
  await ctx.capture(page,cell,'chat','attachment',['actual file selection/signature/upload callbacks','original image recipient','authorized attachment endpoint rendered','isolated Cloudinary adapter, live provider pending']);await ctx.close(page);
}

async function radio(ctx,cell){
  const page=await ctx.createPage(cell);let joinAck,floorAck,audioAck,wire,holdAudio=true;const events=[];
  await page.route('**/api/chat/users',r=>r.fulfill({json:{users:[person]}}));await page.route('**/api/rtc/config',r=>r.fulfill({json:{iceServers:[],turnEnabled:false}}));
  await page.addInitScript(()=>{const original=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);window.__qaOwnedMedia=[];navigator.mediaDevices.getUserMedia=async options=>{const stream=await original(options);window.__qaOwnedMedia.push(stream);return stream}});
  await socketHarness(page,({event,payload,ack,ws})=>{
    events.push(event);if(event==='radio:join'){wire=ws;joinAck=()=>ack({ok:true})}
    else if(event==='radio:request-floor')floorAck=ok=>ack({ok});else if(event==='radio:audio'){if(holdAudio)audioAck=()=>ack({ok:true});else ack({ok:true})}
    else{ack({ok:true});if(event==='presence:join')ws.send('42'+JSON.stringify(['presence:snapshot',{onlineUserIds:[person.id],timestamp:new Date().toISOString()}]))}
  });
  await page.goto(ctx.base+'/operacion/radio');await ctx.wait(()=>Boolean(joinAck));await page.getByText('Conectando',{exact:true}).waitFor();
  await ctx.capture(page,cell,'radio','connecting',['actual radio join ACK held','connecting state','no fake membership roster']);joinAck();await page.getByText('Listo para transmitir',{exact:true}).waitFor();
  assert.equal(await page.locator('.ptt-wave').count(),0);await page.getByText('Presencia en la empresa; no indica participación en este canal.',{exact:true}).waitFor();
  const ptt=page.getByRole('button',{name:/PULSA Y HABLA/});await ctx.actionable(page,ptt);
  await ctx.capture(page,cell,'radio','listening',['actual join positive ACK','existing PTT44px reachable','company presence explicitly not channel roster']);
  await ptt.focus();await page.keyboard.down('Space');await ctx.wait(()=>Boolean(floorAck));await page.getByText('Solicitando turno',{exact:true}).waitFor();
  await ctx.capture(page,cell,'radio','requesting',['actual floor request ACK held','requesting state','one existing press callback']);floorAck(true);await page.getByText('Transmitiendo',{exact:true}).waitFor();
  await ctx.capture(page,cell,'radio','talking',['actual granted floor','real MediaRecorder with fake Chrome input','not hardware audio certification']);await page.keyboard.up('Space');await page.getByText('Terminando transmisión',{exact:true}).waitFor();await ctx.wait(()=>Boolean(audioAck));
  assert.equal(await page.evaluate(()=>window.__qaOwnedMedia.length>0&&window.__qaOwnedMedia.every(s=>s.getTracks().every(t=>t.readyState==='ended'))),true);
  await ctx.capture(page,cell,'radio','finishing',['actual final audio ACK held','microphone tracks stopped immediately','finishing before floor release']);holdAudio=false;audioAck();await page.getByText('Listo para transmitir',{exact:true}).waitFor();assert.ok(events.indexOf('radio:audio')<events.lastIndexOf('radio:release-floor'));
  wire.send('42'+JSON.stringify(['radio:floor',{channelId:'general',userId:person.id,active:true}]));await page.getByText('Canal ocupado',{exact:true}).waitFor();await page.locator('.radio-state-card').getByText(person.name,{exact:true}).waitFor();
  await ctx.capture(page,cell,'radio','busy',['actual floor event','only supplied transmitter identity','PTT disabled while busy']);wire.send('42'+JSON.stringify(['radio:floor',{channelId:'general',userId:person.id,active:false}]));await page.getByText('Listo para transmitir',{exact:true}).waitFor();
  floorAck=null;await ptt.focus();await page.keyboard.down('Space');await ctx.wait(()=>Boolean(floorAck));floorAck(false);await page.getByText('Radio no disponible',{exact:true}).waitFor();await page.keyboard.up('Space');const retry=page.getByRole('button',{name:'Reintentar radio',exact:true});await ctx.actionable(page,retry);
  await ctx.capture(page,cell,'radio','error',['actual floor denial','existing error/retry reachable','no fake success']);joinAck=null;await retry.click();await ctx.wait(()=>Boolean(joinAck));joinAck();await page.getByText('Listo para transmitir',{exact:true}).waitFor();
  floorAck=null;await ptt.focus();await page.keyboard.down('Space');await ctx.wait(()=>Boolean(floorAck));floorAck(true);await page.getByText('Transmitiendo',{exact:true}).waitFor();wire.send('42'+JSON.stringify(['radio:floor-lost',{channelId:'general'}]));await page.getByText('Canal ocupado',{exact:true}).waitFor();await page.keyboard.up('Space');
  assert.equal(await page.evaluate(()=>window.__qaOwnedMedia.every(s=>s.getTracks().every(t=>t.readyState==='ended'))),true);
  await ctx.capture(page,cell,'radio','floor-lost',['actual floor-lost event','capture canceled/owned tracks ended','no unauthorized continued talking']);
  joinAck=null;wire.close({code:1001,reason:'QA controlled reconnect'});await ctx.wait(()=>Boolean(joinAck),'Actual reconnect join',15000);await page.getByText('Conectando',{exact:true}).waitFor();joinAck();await page.getByText('Listo para transmitir',{exact:true}).waitFor();
  await ctx.capture(page,cell,'radio','reconnect',['actual socket close/new join','fresh positive join ACK','listening restored through existing listener']);await ctx.close(page);
}

async function rtc(ctx,cell){
  const page=await ctx.createPage(cell);let release,mode='held';await ctx.realtime(page);
  await page.route('**/api/chat/users',r=>r.fulfill({json:{users:[person]}}));
  await page.route('**/api/rtc/config',async r=>{if(mode==='held')await new Promise(resolve=>release=resolve);return r.fulfill({status:mode==='held'?503:200,json:mode==='held'?{error:'QA_UNAVAILABLE'}:{iceServers:[],turnEnabled:mode==='enabled'}})});
  await page.goto(ctx.base+'/operacion/radio');const console=page.locator('.mobile-v3-rtc');await console.getByText('Cargando llamadas…',{exact:true}).waitFor();await ctx.wait(()=>Boolean(release));
  assert.equal(await console.getByText(/TURN (habilitado|no habilitado) en configuración/).count(),0);
  await ctx.capture(page,cell,'rtc','loading',['actual config request held','loading state','no TURN claim before config']);release();const retry=console.getByRole('button',{name:'Reintentar llamadas',exact:true});await retry.waitFor();await ctx.actionable(page,retry);
  await ctx.capture(page,cell,'rtc','config-error',['actual503 config','existing config error/retry','no TURN claim on failure']);mode='disabled';await retry.click();await console.getByText('TURN no habilitado en configuración',{exact:true}).waitFor();await console.getByText('Sin llamada',{exact:true}).waitFor();
  assert.equal(await console.getByRole('button',{name:'Llamar',exact:true}).isDisabled(),true);assert.equal(await console.getByRole('button',{name:'Colgar',exact:true}).isDisabled(),true);
  await ctx.capture(page,cell,'rtc','idle',['actual successful config','no selected person/call','existing call/hangup disabled']);
  await ctx.capture(page,cell,'rtc','TURN-disabled-config',['actual turnEnabled false','visible configuration label','network traversal explicitly pending']);mode='enabled';await page.reload();await console.getByText('TURN habilitado en configuración',{exact:true}).waitFor();
  await ctx.capture(page,cell,'rtc','TURN-enabled-config',['actual turnEnabled true','configuration label only','no TURN network certification']);await ctx.close(page);

  const pages=[await ctx.createPage(cell),await ctx.createPage(cell)],sockets=new Map(),heldIce=[];let heldOffer,offerReleased=false;
  for(let i=0;i<2;i++){
    const current=pages[i],self='rtc-user-'+i,other='rtc-user-'+(1-i);
    await current.addInitScript(()=>{const original=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);window.__qaRtcMedia=[];navigator.mediaDevices.getUserMedia=async options=>{const stream=await original(options);window.__qaRtcMedia.push(stream);return stream}});
    await current.route('**/api/chat/users',r=>r.fulfill({json:{users:[{id:other,name:'Persona RTC '+(1-i)}]}}));await current.route('**/api/rtc/config',r=>r.fulfill({json:{iceServers:[],turnEnabled:false}}));
    await socketHarness(current,({event,payload,ack,ws})=>{
      if(event==='rtc:signal'){
        const deliver=()=>{for(const receiver of sockets.get(payload.targetUserId)||[])receiver.send('42'+JSON.stringify([event,{fromUserId:self,signal:payload.signal}]))};
        if(payload.signal.type==='offer'&&self==='rtc-user-0'&&!heldOffer)heldOffer=()=>{offerReleased=true;deliver();heldIce.forEach(send=>send())};
        else if(payload.signal.type==='ice'&&self==='rtc-user-0'&&!offerReleased)heldIce.push(deliver);else deliver();
      }
      ack({ok:true});
    },ws=>sockets.set(self,[...(sockets.get(self)||[]),ws]));
    await current.goto(ctx.base+'/operacion/radio');await current.getByLabel('Persona para llamar').selectOption(other);
  }
  const caller=pages[0];await ctx.actionable(caller,caller.getByRole('button',{name:'Llamar',exact:true}));await caller.getByRole('button',{name:'Llamar',exact:true}).click();await ctx.wait(()=>Boolean(heldOffer),'Actual offer signal held');await caller.getByText('Llamando…',{exact:true}).waitFor();
  assert.equal(await caller.getByRole('button',{name:'Colgar',exact:true}).isEnabled(),true);
  await ctx.capture(caller,cell,'rtc','calling',['actual createPeer/getUserMedia/offer','signal offer held at transport boundary','existing Colgar enabled']);heldOffer();
  await Promise.all(pages.map(p=>p.getByText('Llamada conectada',{exact:true}).waitFor({timeout:15000})));
  for(const current of pages)assert.equal(await current.locator('audio').evaluate(n=>n.srcObject?.getAudioTracks().some(t=>t.readyState==='live')),true);
  await ctx.capture(caller,cell,'rtc','connected-real-peers',['two actual RTCPeerConnections/signaling/ICE','live remote audio track on both peers','fake Chrome input; hardware/network certification pending']);
  const hangup=caller.getByRole('button',{name:'Colgar',exact:true});await ctx.actionable(caller,hangup);await hangup.click();await Promise.all(pages.map(p=>p.getByText('Sin llamada',{exact:true}).waitFor()));
  for(const current of pages){assert.equal(await current.locator('audio').evaluate(n=>n.srcObject),null);assert.equal(await current.evaluate(()=>window.__qaRtcMedia.length>0&&window.__qaRtcMedia.every(s=>s.getTracks().every(t=>t.readyState==='ended'))),true)}
  await ctx.capture(caller,cell,'rtc','hangup-cleanup',['actual hangup signal reaches both peers','owned local audio tracks ended','remote audio srcObject cleared','existing cleanup lifecycle']);await Promise.all(pages.map(p=>ctx.close(p)));
}
