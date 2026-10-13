import { Suspense, type ReactNode } from "react";
import Hero from "@/components/Hero";
import Marquee from "@/components/Marquee";
import ServicesRail from "@/components/ServicesRail";
import Solutions from "@/components/Solutions";
import CaseStack from "@/components/CaseStack";
import Showreel from "@/components/Showreel";
import ProcessPinned from "@/components/ProcessPinned";
import Stats from "@/components/Stats";
import Testimonials from "@/components/Testimonials";
import Pricing from "@/components/Pricing";
import FAQ from "@/components/FAQ";
import FinalCTA from "@/components/FinalCTA";

// Each below-fold section is its own Suspense boundary → React hydrates them selectively and
// interruptibly instead of in one long main-thread task.
const Lazy = ({ children }: { children: ReactNode }) => <Suspense fallback={null}>{children}</Suspense>;

// Home = the cinematic overview. Each section previews its full page (/services, /work, …) via "View all" links.
export default function Home() {
  return (
    <main id="main">
      <Hero />
      <Lazy><Marquee /></Lazy>
      <Lazy><ServicesRail more={{ href: "/services", label: "Explore all services" }} /></Lazy>
      <Lazy><Solutions more={{ href: "/solutions", label: "See how we build systems" }} /></Lazy>
      <Lazy><CaseStack limit={3} more={{ href: "/work", label: "View all work" }} /></Lazy>
      <Lazy><Showreel /></Lazy>
      <Lazy><ProcessPinned more={{ href: "/process", label: "Our full process" }} /></Lazy>
      <Stats />
      <Lazy><Testimonials /></Lazy>
      <Lazy><Pricing more={{ href: "/pricing", label: "Pricing & estimate" }} /></Lazy>
      <Lazy><FAQ limit={4} more={{ href: "/faq", label: "All questions" }} /></Lazy>
      <Lazy><FinalCTA /></Lazy>
    </main>
  );
}
