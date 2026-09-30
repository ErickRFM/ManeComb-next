import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";

const baseUrl=process.env.VISUAL_QA_BASE_URL||"http://127.0.0.1:3000";
const output="artifacts/visual-qa";
mkdirSync(output,{recursive:true});

const widths=[360,390,430,768,1024,1366,1920];
const surfaces=["portal","admin","driver","forms"];
const report={generatedAt:new Date().toISOString(),checks:[],violations:[]};
const browser=await chromium.launch({headless:true});

try{
  for(const width of widths){
    for(const surface of surfaces){
      const height=width<=430?820:width<=768?900:960;
      const context=await browser.newContext({viewport:{width,height},colorScheme:"dark",reducedMotion:"reduce"});
      const page=await context.newPage();
      await page.goto(baseUrl+"/__visual/"+surface,{waitUntil:"networkidle"});

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
        report.violations.push({surface,width,violations:severe.map(item=>({id:item.id,impact:item.impact,help:item.help,nodes:item.nodes.length}))});
        throw new Error("Accessibility violations at "+surface+" "+width+"px: "+severe.map(item=>item.id).join(", "));
      }

      const path=output+"/"+surface+"-"+width+".png";
      await page.screenshot({path,fullPage:true});
      report.checks.push({surface,width,overflow,criticalTargets:"ok",accessibility:"ok",screenshot:path});
      await context.close();
    }
  }
}finally{
  await browser.close();
  writeFileSync(output+"/report.json",JSON.stringify(report,null,2));
}
