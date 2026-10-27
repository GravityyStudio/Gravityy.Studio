import { Suspense, type ReactNode } from "react";
import HomeHero from "@/components/home/HomeHero";
import { LogoStrip, TeamBlock } from "@/components/home/Trust";
import ServiceRows from "@/components/home/ServiceRows";
import NodeNetwork from "@/components/home/NodeNetwork";
import WorkGrid from "@/components/work/WorkGrid";
import HomeProcess from "@/components/home/HomeProcess";
import HomeVoices from "@/components/home/HomeVoices";
import HomePricing from "@/components/home/HomePricing";
import HomeFaq from "@/components/home/HomeFaq";
import JsonLd from "@/components/JsonLd";
import { getContent } from "@/lib/content";
import { faqLd } from "@/lib/seo";

// Each below-fold section is its own Suspense boundary → React hydrates them selectively and
// interruptibly instead of in one long main-thread task.
const Lazy = ({ children }: { children: ReactNode }) => <Suspense fallback={null}>{children}</Suspense>;

// Home: promise → who we've shipped for → what we build → how it fits → proof → how we work → voices → team → price →
// questions. The free audit (the primary CTA) is the footer's form, #audit, on every page.
export default async function Home() {
  const content = await getContent();
  return (
    <main id="main">
      <JsonLd data={faqLd(content)} />
      <HomeHero />
      <LogoStrip />
      <Lazy><ServiceRows /></Lazy>
      <Lazy><NodeNetwork /></Lazy>
      <Lazy><WorkGrid title="Selected work" limit={3} /></Lazy>
      <Lazy><HomeProcess /></Lazy>
      <Lazy><HomeVoices /></Lazy>
      <TeamBlock />
      <Lazy><HomePricing /></Lazy>
      <Lazy><HomeFaq /></Lazy>
    </main>
  );
}
