import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";

const baseUrl=process.env.VISUAL_QA_BASE_URL||"http://127.0.0.1:3000";
const output="artifacts/visual-qa";
mkdirSync(output,{recursive:true});

const widths=[360,390,430,768,1024,1366,1440,1920];
const surfaces=["portal","admin","driver","forms","marketing"];
const report={generatedAt:new Date().toISOString(),checks:[],violations:[]};
const browser=await chromium.launch({headless:true});

try{
  for(const theme of ["dark","light"]){
  for(const width of widths){
    for(const surface of surfaces){
      const height=width<=430?820:width<=768?900:960;
      const context=await browser.newContext({viewport:{width,height},colorScheme:theme,reducedMotion:"reduce"});
      const page=await context.newPage();
      await page.goto(baseUrl+"/visual-qa/"+surface,{waitUntil:"networkidle"});
      if(surface==="forms"){
        const trigger=page.getByRole("button",{name:"Abrir modal"});
        await trigger.click();
        const dialog=page.getByRole("dialog");
        const field=dialog.getByRole("textbox",{name:"Nombre de unidad"});
        await field.fill("C-Keyboard");
        await page.waitForTimeout(50);
        if(!await field.evaluate(node=>node===document.activeElement))throw new Error("Modal lost input focus after typing");
        const save=dialog.getByRole("button",{name:"Guardar"});
        await save.focus();await page.keyboard.press("Tab");
        if(!await dialog.getByRole("button",{name:"Cerrar",exact:true}).evaluate(node=>node===document.activeElement))throw new Error("Modal Tab trap failed");
        await page.keyboard.press("Escape");
        if(await dialog.count() || !await trigger.evaluate(node=>node===document.activeElement))throw new Error("Modal Escape/return focus failed");
      }

      const overflow=await page.evaluate(()=>({
        scrollWidth:document.documentElement.scrollWidth,
        innerWidth:window.innerWidth,
        scrollHeight:document.documentElement.scrollHeight
      }));
      if(overflow.scrollWidth>overflow.innerWidth+1){
        throw new Error("Horizontal overflow at "+surface+" "+width+"px: "+overflow.scrollWidth+" > "+overflow.innerWidth);
      }

      const targetIssues=await page.locator("[data-critical-action]").evaluateAll((nodes)=>nodes.map(node=>{
        const rect=node.getBoundingClientRect();
        return {text:(node.textContent||"").trim(),width:rect.width,height:rect.height};
      }).filter(item=>item.width<44||item.height<44));
      if(targetIssues.length)throw new Error("Critical touch target below 44px at "+surface+" "+width+"px: "+JSON.stringify(targetIssues));

      const axe=await new AxeBuilder({page}).analyze();
      const severe=axe.violations.filter(item=>item.impact==="critical"||item.impact==="serious");
      if(severe.length){
        report.violations.push({surface,width,violations:severe.map(item=>({
          id:item.id,
          impact:item.impact,
          help:item.help,
          nodes:item.nodes.map(node=>({
            target:node.target,
            html:node.html,
            failureSummary:node.failureSummary
          }))
        }))});
        console.error(JSON.stringify(report.violations.at(-1),null,2));
        throw new Error("Accessibility violations at "+surface+" "+width+"px: "+severe.map(item=>item.id).join(", "));
      }

      const path=output+"/"+surface+"-"+theme+"-"+width+".png";
      await page.screenshot({path,fullPage:true});
      report.checks.push({surface,theme,width,overflow,criticalTargets:"ok",accessibility:"ok",screenshot:path});
      await context.close();
    }
  }
  }
}finally{
  await browser.close();
  writeFileSync(output+"/report.json",JSON.stringify(report,null,2));
}
