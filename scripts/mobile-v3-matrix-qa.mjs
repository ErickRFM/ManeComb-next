// Expanded browser QA only. No fixture is imported by product code.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import AxeBuilder from '@axe-core/playwright';
import {authMatrix} from './mobile-v3-matrix/auth.mjs';
import {operationMatrix} from './mobile-v3-matrix/operation.mjs';
import {communicationsMatrix} from './mobile-v3-matrix/communications.mjs';
import {alertsMoreMatrix} from './mobile-v3-matrix/alerts-more.mjs';
import {mapboxMatrix} from './mobile-v3-matrix/mapbox.mjs';

const root='artifacts/mobile-v3-final-qa';
const viewports=[[360,800],[390,844],[412,915],[430,932],[768,900],[1024,960],[1366,960],[1440,960],[1920,960],[844,390],[915,412]];
const realStates=['provider-real','provider-failure','recenter','manual-camera','motion-policy'];
const git=(...args)=>execFileSync('git',args,{encoding:'utf8'}).trim();
const dirty=()=>git('status','--porcelain','--untracked-files=all').split('\n').filter(line=>line&&line.slice(3)!=='next-env.d.ts');

export async function runMobileV3Matrix(input){
  const required=JSON.parse(await readFile(new URL('./mobile-v3-matrix-required-states.json',import.meta.url),'utf8'));
  assert.equal(Object.values(required).flat().length,92);
  const sourceSha=git('rev-parse','HEAD'),real=process.env.QA_MAPBOX==='1';
  const filters={family:process.env.QA_V3_FAMILY,viewport:process.env.QA_V3_VIEWPORT,theme:process.env.QA_V3_THEME,motion:process.env.QA_V3_MOTION};
  const runId=sourceSha.slice(0,8)+'-'+Date.now()+'-'+(real?'real-mapbox':'general');
  const folder=root+'/matrix-screens/'+runId,rows=[],failures=[],activePages=new Set();
  const report={sourceSha,status:'RUNNING',diagnostic:dirty().length>0||Object.values(filters).some(Boolean),filters,startedAt:new Date().toISOString(),rows,failures};
  await mkdir(folder,{recursive:true});await mkdir(root+'/matrix-runs/'+runId,{recursive:true});
  const selected=(family,state)=>required[family]?.includes(state)&&(!filters.family||filters.family===family);
  async function wait(condition,label='actual asynchronous event',timeout=5000){const until=Date.now()+timeout;while(!condition()&&Date.now()<until)await new Promise(resolve=>setTimeout(resolve,15));assert.ok(condition(),label)}
  async function createPage(cell,channel='mobile_operations'){
    const page=await input.pageFor(channel,{viewport:cell.viewport,reducedMotion:cell.motion});activePages.add(page);
    await page.addInitScript(theme=>localStorage.setItem('manecomb.theme',theme),cell.theme);return page;
  }
  async function close(page){await page.context().close();activePages.delete(page)}
  async function actionable(page,target){
    await target.waitFor({state:'visible'});
    const stable=()=>target.evaluate(node=>new Promise((resolve,reject)=>{let previous='',frames=0;const until=performance.now()+5000;function sample(){const r=node.getBoundingClientRect(),value=JSON.stringify([scrollX,scrollY,r.x,r.y,r.width,r.height]);frames=value===previous?frames+1:0;previous=value;if(frames>=12)return resolve();if(performance.now()>until)return reject(new Error('Actual focus/scroll geometry did not settle'));requestAnimationFrame(sample)}requestAnimationFrame(sample)}));
    await stable();await target.evaluate(n=>n.scrollIntoView({block:'center',inline:'nearest',behavior:'instant'}));await input.settleVisualState(page);await stable();
    const geometry=await target.evaluate(n=>{const r=n.getBoundingClientRect();return {width:r.width,height:r.height,visible:r.top>=0&&r.bottom<=innerHeight+1&&r.left>=0&&r.right<=innerWidth+1,hit:n.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))}});
    assert.ok(geometry.width>=44&&geometry.height>=44&&geometry.visible&&geometry.hit,'Actual44px/full viewport/center-hit target '+JSON.stringify(geometry));return geometry;
  }
  async function capture(page,cell,family,state,assertions,extra={}){
    assert.ok(selected(family,state),'Unapproved matrix state '+family+'/'+state);
    assert.ok(assertions.length&&assertions.every(text=>typeof text==='string'&&text));
    await input.settleVisualState(page);
    assert.equal(await page.evaluate(()=>document.documentElement.dataset.theme),cell.theme,'Actual theme must match row');
    assert.equal(await page.evaluate(()=>matchMedia('(prefers-reduced-motion: reduce)').matches),cell.motion==='reduce','Actual motion must match row');
    const overflow=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
    const axe=await new AxeBuilder({page}).analyze();
    const violations=axe.violations.filter(v=>['serious','critical'].includes(v.impact)).map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,reason:n.failureSummary}))}));
    // Ensure timed states still exist at the screenshot, rather than certifying
    // an assertion made before Axe while an existing timeout changed the UI.
    const stateObservation=await page.evaluate(({family,state})=>{
      if(family==='radio'){const expected={connecting:'connecting',listening:'listening',requesting:'requesting',talking:'talking',finishing:'finishing',busy:'busy',error:'error','floor-lost':'busy',reconnect:'listening'}[state];return{expected,actual:document.querySelector('.ptt-stage')?.classList.contains(expected)}}
      if(family==='chat'&&state==='pending')return{expected:'Enviando…',actual:[...document.querySelectorAll('.message-bubble')].some(n=>n.textContent.includes('Enviando…'))};
      if(family==='auth'&&(state==='loading'||state.endsWith('-pending')))return{expected:'aria-busy true',actual:document.querySelector('.operation-auth-shell form')?.getAttribute('aria-busy')==='true'};
      if(family==='auth'&&['bootstrap-loading','bootstrap-retry'].includes(state))return{expected:'session loading',actual:document.querySelector('.operation-session-check')?.getAttribute('aria-busy')==='true'};
      if(family==='rtc'&&['loading','calling','connected-real-peers'].includes(state)){const expected={loading:'Cargando llamadas…',calling:'Llamando…','connected-real-peers':'Llamada conectada'}[state];return{expected,actual:document.querySelector('.mobile-v3-rtc')?.textContent.includes(expected)}}
      return null;
    },{family,state});
    const path=folder+'/'+cell.viewport.width+'x'+cell.viewport.height+'-'+cell.theme+'-'+cell.motion+'-'+family+'-'+state+'.png';
    await page.screenshot({path,fullPage:true});
    const row={sourceSha,family,state,viewport:cell.viewport,theme:cell.theme,motion:cell.motion,status:violations.length||overflow.scroll>overflow.width+1||stateObservation&&!stateObservation.actual?'FAIL':'PASS',assertions:[...assertions,'actual theme/motion','Axe zero serious/critical','horizontal overflow <=1px'],screens:[path],violations,overflow,stateObservation,...extra};rows.push(row);
    if(stateObservation)assert.equal(Boolean(stateObservation.actual),true,'Timed state must remain actual at screenshot '+family+'/'+state);
    assert.deepEqual(violations,[],'Axe '+family+'/'+state+' '+JSON.stringify(cell));assert.ok(overflow.scroll<=overflow.width+1,'Horizontal overflow '+family+'/'+state);
    console.log('MATRIX '+family+'/'+state+' '+cell.viewport.width+'x'+cell.viewport.height+' '+cell.theme+' '+cell.motion+' PASS');return row;
  }
  const ctx={...input,sourceSha,root,required,selected,wait,createPage,close,actionable,capture};
  try{
    for(const [width,height] of viewports)for(const theme of ['dark','light'])for(const motion of ['no-preference','reduce']){
      if(filters.viewport&&filters.viewport!==width+'x'+height||filters.theme&&filters.theme!==theme||filters.motion&&filters.motion!==motion)continue;
      const cell={viewport:{width,height},theme,motion};
      if(real){if(!filters.family||filters.family==='map')await mapboxMatrix(ctx,cell)}
      else{
        if(!filters.family||filters.family==='auth')await authMatrix(ctx,cell);
        if(!filters.family||['map','sheet','journey','route'].includes(filters.family))await operationMatrix(ctx,cell);
        if(!filters.family||['chat','radio','rtc'].includes(filters.family))await communicationsMatrix(ctx,cell);
        if(!filters.family||['alerts','more'].includes(filters.family))await alertsMoreMatrix(ctx,cell);
      }
    }
    const expected=[];
    for(const [family,states]of Object.entries(required))for(const state of states){
      if((family==='map'&&realStates.includes(state))!==real||filters.family&&filters.family!==family)continue;
      for(const [width,height]of viewports)for(const theme of ['dark','light'])for(const motion of ['no-preference','reduce']){
        if(filters.viewport&&filters.viewport!==width+'x'+height||filters.theme&&filters.theme!==theme||filters.motion&&filters.motion!==motion)continue;
        expected.push([family,state,width,height,theme,motion].join('/'));
      }
    }
    const identities=rows.map(row=>[row.family,row.state,row.viewport.width,row.viewport.height,row.theme,row.motion].join('/'));
    assert.ok(expected.length,'Diagnostic filters select no approved rows');assert.deepEqual([...identities].sort(),expected.sort(),'Missing or duplicate actual state rows');
    assert.equal(git('rev-parse','HEAD'),sourceSha,'Source changed during matrix');report.diagnostic||=dirty().length>0;report.status='PASS';
  }catch(error){report.status='FAIL';failures.push({error:String(error.stack||error)});throw error}
  finally{
    await Promise.allSettled([...activePages].map(page=>page.context().close()));report.completedAt=new Date().toISOString();
    report.limitations=['Isolated API/Socket.IO fixtures and fake Chrome microphone input are browser evidence, not production data/permissions, native UI-ready, physical IME/insets/touch/audio/TURN/GPS/Doze, RC3 parity or human reading-time certification'];
    const name=real?'real-mapbox-matrix.json':'final-matrix.json';const text=JSON.stringify(report,null,2);await writeFile(root+'/matrix-runs/'+runId+'/'+name,text);await writeFile(root+'/'+name,text);
  }
}
