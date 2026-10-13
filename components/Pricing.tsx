"use client";
import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { CircleCheck } from "lucide-react";
import { useContent } from "./ContentProvider";
import { MOTION } from "@/lib/motion";
import { useReveal } from "@/hooks/useReveal";
import { useUI } from "./Providers";
import SectionHeading from "./ui/SectionHeading";
import Button from "./ui/Button";
import { REGION_COOKIE, formatMinor } from "@/lib/billing";

const TABS = [
  { id: "india", label: "India" },
  { id: "intl", label: "International" },
] as const;
type Region = (typeof TABS)[number]["id"];

type More = { href: string; label: string };

export default function Pricing({ more }: { more?: More }) {
  const { pricing, plans, addons } = useContent();
  const ref = useRef<HTMLElement>(null);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const [region, setRegion] = useState<Region>("india");
  const [pill, setPill] = useState<{ x: number; w: number } | null>(null);
  const { openContact } = useUI();
  useReveal(ref);

  // Default tab = billing region set by the edge proxy (country → `region` cookie).
  useEffect(() => {
    const m = document.cookie.match(new RegExp(`(?:^|; )${REGION_COOKIE}=(IN|GLOBAL)`));
    if (m?.[1] === "GLOBAL") setRegion("intl");
  }, []);

  // Pill underline slides (0.3s) to the active tab; measured so it fits labels of any width.
  useLayoutEffect(() => {
    const el = tabs.current[TABS.findIndex((t) => t.id === region)];
    if (el) setPill({ x: el.offsetLeft, w: el.offsetWidth });
  }, [region]);

  // Roving tabindex: ←/→/Home/End move between tabs.
  const onKey = (e: KeyboardEvent, i: number) => {
    const next = e.key === "ArrowRight" ? i + 1 : e.key === "ArrowLeft" ? i - 1 : e.key === "Home" ? 0 : e.key === "End" ? TABS.length - 1 : null;
    if (next === null) return;
    e.preventDefault();
    const j = (next + TABS.length) % TABS.length;
    setRegion(TABS[j].id);
    tabs.current[j]?.focus();
  };

  const regionLabel = region === "india" ? "India" : "International";
  const extras = addons.filter((a) => a.region === (region === "india" ? "IN" : "GLOBAL")); // Content → Add-ons

  return (
    <section ref={ref} id="pricing" aria-labelledby="pricing-h" className="section cv">
      <div className="container-x">
        <SectionHeading id="pricing-h" index="10" eyebrow="Pricing" title="Choose how you want to build and grow." lede="Fixed-price builds and monthly growth plans, priced for India and international clients." more={more} />
        <div role="tablist" aria-label="Region" className="relative mt-12 inline-flex rounded-full border border-line p-1">
          {pill && (
            <span
              aria-hidden="true"
              className="absolute left-0 top-1 h-[calc(100%-8px)] rounded-full bg-fg"
              style={{ width: pill.w, transform: `translateX(${pill.x}px)`, transition: `transform ${MOTION.dur.tab}s cubic-bezier(.22,1,.36,1), width ${MOTION.dur.tab}s cubic-bezier(.22,1,.36,1)` }}
            />
          )}
          {TABS.map((t, i) => {
            const on = region === t.id;
            return (
              <button
                key={t.id}
                ref={(el) => {
                  tabs.current[i] = el;
                }}
                role="tab"
                id={`tab-${t.id}`}
                aria-selected={on}
                aria-controls="pricing-panel"
                tabIndex={on ? 0 : -1}
                onClick={() => setRegion(t.id)}
                onKeyDown={(e) => onKey(e, i)}
                className={`relative min-h-[44px] rounded-full px-6 text-[15px] font-medium transition-colors duration-300 ${on ? `text-bg ${pill ? "" : "bg-fg"}` : "text-muted hover:text-fg"}`}
              >
                <span className="relative">{t.label}</span>
              </button>
            );
          })}
        </div>

        <div id="pricing-panel" role="tabpanel" aria-labelledby={`tab-${region}`} className="mt-10 grid gap-5 md:grid-cols-2">
          {pricing[region].map((p) => {
            // Price from plans (same row checkout charges); the CMS card's text price is only a fallback.
            const plan = plans.find((x) => x.id === (p as { planId?: string }).planId && x.active);
            const price = plan ? formatMinor(plan.amount_minor, plan.currency) : p.price;
            return (
            // Static card (no tilt): its buy/contact buttons must stay in place under the cursor.
            <article
              key={p.name}
              data-card
              className={`flex flex-col gap-6 rounded-card border p-7 transition-colors duration-300 sm:p-10 ${p.hi ? "border-accent/50 bg-hi" : "border-line bg-surface-2 hover:border-line-strong"}`}
            >
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-2xl font-medium tracking-[-0.03em]">{p.name}</h3>
                <span className={`rounded-full border px-3 py-1 font-mono text-[11px] uppercase tracking-[0.12em] ${p.hi ? "border-accent/50 text-accent" : "border-line text-muted"}`}>{p.tag}</span>
              </div>
              <p className="text-[15px] leading-relaxed text-muted">{p.desc}</p>
              <p className="flex flex-wrap items-baseline gap-2">
                <span className="text-[15px] text-muted">from</span>
                <span className="text-[clamp(44px,5vw,64px)] font-medium leading-none tracking-[-0.045em]">{price}</span>
                <span className="text-[15px] text-muted">{p.unit}</span>
              </p>
              {plan && plan.gst_rate > 0 && <p className="-mt-3 text-[13px] text-muted">+ {Math.round(plan.gst_rate * 100)}% GST at checkout</p>}
              <ul className="flex flex-col gap-3 border-t border-line pt-6">
                {p.features.map((f) => (
                  <li key={f} className="flex gap-3 text-[15px] leading-snug">
                    <CircleCheck size={18} aria-hidden="true" className={`mt-px shrink-0 ${p.hi ? "text-accent" : "text-fg/60"}`} />
                    {f}
                  </li>
                ))}
              </ul>
              <div className="mt-auto flex flex-col gap-2">
                {plan ? (
                  <Button href={`/pricing/checkout?plan=${plan.id}`} variant={p.hi ? "accent" : "primary"} className="w-full">
                    {p.cta}
                  </Button>
                ) : null}
                <Button
                  variant={plan ? "ghost" : p.hi ? "accent" : "ghost"}
                  className="w-full"
                  onClick={() => openContact(`Hi Gravityy team,\n\nI'm interested in the ${p.name} plan (${regionLabel}, from ${price} ${p.unit}).\n\nAbout the project:\n`)}
                >
                  {plan ? "Talk to us first" : p.cta}
                </Button>
              </div>
            </article>
            );
          })}
        </div>
        {extras.length > 0 && (
          <div className="mt-10">
            <h3 className="mb-4 font-mono text-xs uppercase tracking-[0.14em] text-muted">Add-ons</h3>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {extras.map((a) => (
                <li key={a.id} className="card flex items-start justify-between gap-4 p-5">
                  <div>
                    <p className="font-medium">{a.name}</p>
                    {a.description && <p className="mt-1 text-[14px] leading-relaxed text-muted">{a.description}</p>}
                  </div>
                  <p className="shrink-0 font-medium tabular-nums">+{formatMinor(a.price_minor, a.currency)}</p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
