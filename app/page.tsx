import { Suspense, type ReactNode } from "react";
import HomeHero from "@/components/home/HomeHero";
import Team from "@/components/home/Team";
import TrustedBy from "@/components/home/TrustedBy";
import About from "@/components/home/About";
import Stats from "@/components/home/Stats";
import Contact from "@/components/home/Contact";
import ServiceRows from "@/components/home/ServiceRows";
import NodeNetwork from "@/components/home/NodeNetwork";
import WorkGrid from "@/components/work/WorkGrid";
import HomeProcess from "@/components/home/HomeProcess";
import Testimonials from "@/components/home/Testimonials";
import HomePricing from "@/components/home/HomePricing";
import HomeFaq from "@/components/home/HomeFaq";
import JsonLd from "@/components/JsonLd";
import { getContent } from "@/lib/content";
import { faqLd } from "@/lib/seo";

// Each below-fold section is its own Suspense boundary → React hydrates them selectively and
// interruptibly instead of in one long main-thread task.
const Lazy = ({ children }: { children: ReactNode }) => <Suspense fallback={null}>{children}</Suspense>;

// Home, in order: hero → trusted by → about → services → why us → stats → process → portfolio → team → testimonials →
// pricing → FAQ → contact. The free audit form (the primary CTA) is in the footer (#audit) on every page.
export default async function Home() {
  const content = await getContent();
  return (
    <main id="main">
      <JsonLd data={faqLd(content)} />
      <HomeHero />
      <TrustedBy />
      <About />
      <Lazy><ServiceRows /></Lazy>
      <Lazy><NodeNetwork /></Lazy>
      <Stats />
      <Lazy><HomeProcess /></Lazy>
      <Lazy><WorkGrid title="Portfolio" limit={3} /></Lazy>
      <Team limit={4} />
      <Lazy><Testimonials /></Lazy>
      <Lazy><HomePricing /></Lazy>
      <Lazy><HomeFaq /></Lazy>
      <Lazy><Contact /></Lazy>
    </main>
  );
}
