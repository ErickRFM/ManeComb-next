import { Navigation } from "@/src/components/navigation";
import { MarketingHero } from "@/src/components/marketing/marketing-hero";
import { MarketingProductStory } from "@/src/components/marketing/marketing-product-story";
import { MarketingBento } from "@/src/components/marketing/marketing-bento";
import { MarketingProcess } from "@/src/components/marketing/marketing-process";
import { MarketingFaq } from "@/src/components/marketing/marketing-faq";
import { MarketingFinalCta } from "@/src/components/marketing/marketing-final-cta";
import { MarketingFooter } from "@/src/components/marketing/marketing-footer";
import { PlanCards } from "@/src/components/plan-cards";
import { Reveal } from "@/src/components/ui/reveal";

export default function HomePage(){
  return <div className="shell marketing-home marketing-v3">
    <Navigation/>
    <main id="main-content">
      <MarketingHero/>
      <MarketingProductStory/>
      <MarketingBento/>
      <MarketingProcess/>

      <section id="planes" className="marketing-v3-section marketing-plans-section">
        <Reveal><div className="marketing-v3-section-head compact">
          <span className="marketing-kicker">PLANES</span>
          <h2>Elige el tamaño de tu flota.</h2>
          <p>Empieza con la capacidad que necesitas y conserva el mismo sistema al crecer.</p>
        </div></Reveal>
        <Reveal delay={70}><PlanCards/></Reveal>
      </section>

      <MarketingFaq/>
      <MarketingFinalCta/>
    </main>
    <MarketingFooter/>
  </div>;
}
