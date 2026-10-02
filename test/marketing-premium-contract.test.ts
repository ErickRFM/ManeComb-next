import {readFileSync} from "node:fs";
import {describe,expect,it} from "vitest";

const read=(path:string)=>readFileSync(new URL("../"+path,import.meta.url),"utf8");

describe("marketing premium V3 contract",()=>{
  it("keeps the landing componentized and product-first",()=>{
    const page=read("app/(marketing)/page.tsx");
    for(const component of ["MarketingHero","MarketingProductStory","MarketingBento","MarketingProcess","MarketingFaq","MarketingFinalCta","MarketingFooter"]){
      expect(page).toContain("<"+component);
    }
    expect(page).not.toContain("MarketingProductPreview");
  });

  it("keeps commercial plan truth in the canonical domain catalog",()=>{
    const plans=read("src/components/plan-cards.tsx");
    expect(plans).toContain("COMMERCIAL_PLANS.map");
    expect(plans).toContain('href={"/checkout/"+plan.code}');
    for(const hardcoded of ["$99","$159","$289","$449","$729"])expect(plans).not.toContain(hardcoded);
  });

  it("preserves responsive and reduced-motion marketing gates",()=>{
    const css=read("src/styles/marketing-premium.css");
    for(const width of ["1180px","980px","760px","560px","390px"])expect(css).toContain("@media(max-width:"+width+")");
    expect(css).toContain("@media(prefers-reduced-motion:reduce)");
    expect(css).toContain("--mkt-red:var(--marketing-brand)");
  });

  it("keeps key conversion destinations",()=>{
    const nav=read("src/components/navigation.tsx");
    const hero=read("src/components/marketing/marketing-hero.tsx");
    expect(nav).toContain('href="/login"');
    expect(nav).toContain('href="/registro"');
    expect(hero).toContain('href="/registro"');
    expect(hero).toContain('href="/#producto"');
  });
});
