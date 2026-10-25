import { Suspense, type ReactNode } from "react";
import HomeHero from "@/components/home/HomeHero";
import HomeWork from "@/components/home/HomeWork";
import HomeServices from "@/components/home/HomeServices";
import HomeProcess from "@/components/home/HomeProcess";
import HomeReel from "@/components/home/HomeReel";
import HomeVoices from "@/components/home/HomeVoices";
import HomePricing from "@/components/home/HomePricing";
import HomeFaq from "@/components/home/HomeFaq";
import HomeCta from "@/components/home/HomeCta";

// Each below-fold section is its own Suspense boundary → React hydrates them selectively and
// interruptibly instead of in one long main-thread task.
const Lazy = ({ children }: { children: ReactNode }) => <Suspense fallback={null}>{children}</Suspense>;

// Home = the argument in order: what we make (work), what we do (services), how (process), the reel,
// what clients say, what it costs (the live price), questions, then the audit. Each section links to its full page.
export default function Home() {
  return (
    <main id="main">
      <HomeHero />
      <Lazy><HomeWork /></Lazy>
      <Lazy><HomeServices /></Lazy>
      <Lazy><HomeProcess /></Lazy>
      <Lazy><HomeReel /></Lazy>
      <Lazy><HomeVoices /></Lazy>
      <Lazy><HomePricing /></Lazy>
      <Lazy><HomeFaq /></Lazy>
      <Lazy><HomeCta /></Lazy>
    </main>
  );
}
