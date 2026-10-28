"use client";
import { ArrowUpRight, Mail } from "lucide-react";
import Link from "@/components/ui/SmartLink";
import Button from "@/components/ui/Button";
import { useContent } from "../ContentProvider";
import { useUI } from "../Providers";

/** Contact: three ways in (free audit, a message, email). The audit form itself lives in the footer (#audit). */
export default function Contact() {
  const { site } = useContent();
  const { openContact } = useUI();
  return (
    <section id="contact" data-glow aria-labelledby="contact-h" className="py-[clamp(56px,8vh,96px)]">
      <div className="container-x grid gap-10 lg:grid-cols-12 lg:items-end lg:gap-x-8">
        <div className="lg:col-span-7">
          <h2 id="contact-h" data-reveal className="display !text-[clamp(30px,4vw,56px)]">
            Let&apos;s talk
          </h2>
          <p className="mt-6 max-w-[46ch] text-fg/85">Tell us about the project, or start with a free audit of the site you have today. Made in India, working worldwide.</p>
        </div>
        <div className="flex flex-col gap-4 lg:col-span-5">
          <div className="flex flex-wrap gap-3">
            <Button href="#audit" variant="accent">
              Get a free audit
            </Button>
            <Button onClick={() => openContact()} variant="ghost">
              Send a message
            </Button>
          </div>
          <a href={`mailto:${site.email}`} className="inline-flex min-h-[44px] w-fit items-center gap-2 font-mono text-[15px] text-fg/85 underline decoration-fg/30 underline-offset-4 hover:decoration-accent">
            <Mail size={16} aria-hidden="true" />
            {site.email}
          </a>
          <Link href="/contact" className="inline-flex min-h-[44px] w-fit items-center gap-1 text-[15px] text-muted hover:text-fg">
            Contact page <ArrowUpRight size={14} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}
