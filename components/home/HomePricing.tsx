"use client";
import { useRef, useState } from "react";
import Link from "@/components/ui/SmartLink";
import { formatMinor } from "@/lib/billing";
import { useEnter } from "@/hooks/useEnter";
import { useContent } from "../ContentProvider";
import { useUI } from "../Providers";
import Button from "../ui/Button";

type Region = "india" | "intl";
const REGIONS: [Region, string][] = [
  ["india", "India (₹)"],
  ["intl", "International ($)"],
];

/** The page's live tool: pick the engagement and where you are billed; the price redraws at display size. */
export default function HomePricing() {
  const { pricing, plans } = useContent();
  const { openContact } = useUI();
  const ref = useRef<HTMLElement>(null);
  useEnter(ref);
  const [region, setRegion] = useState<Region>("india");
  const [kind, setKind] = useState(0);

  const cards = pricing[region];
  const card = cards[Math.min(kind, cards.length - 1)];
  // Price from plans (the row checkout charges); the CMS card's text price is only a fallback.
  const plan = plans.find((p) => p.id === (card as { planId?: string }).planId && p.active);
  const price = plan ? formatMinor(plan.amount_minor, plan.currency) : card.price;
  const [, symbol = "", amount = price] = price.match(/^(\D*)(.+)$/) ?? [];

  const pill = (on: boolean) =>
    `inline-flex min-h-[44px] cursor-pointer items-center rounded-full px-5 text-[15px] font-medium transition-colors duration-200 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent ${on ? "bg-fg text-bg" : "bg-raised text-fg hover:bg-line"}`;

  return (
    <section ref={ref} id="pricing" data-chapter="dark" aria-labelledby="pricing-h" className="bg-bg py-[clamp(96px,14vh,180px)]">
      {/* Phones read heading → price → choices → details; from lg the choices sit left of the price. */}
      <div className="container-x grid min-h-[70svh] content-center gap-10 lg:grid-cols-12 lg:gap-x-8 lg:gap-y-10">
        <div data-enter className="flex flex-col gap-4 lg:col-span-4 lg:row-start-1 lg:self-end">
          <h2 id="pricing-h" className="text-[clamp(28px,3vw,40px)] font-medium leading-tight tracking-[-0.03em]">
            What it costs
          </h2>
          <p className="max-w-[40ch] text-[17px] leading-relaxed">Fixed-price builds and a monthly growth team. Pick one to see the price and what it includes.</p>
        </div>

        <div data-enter className="flex flex-col gap-3 lg:col-span-7 lg:col-start-6 lg:row-start-1 lg:self-end">
          <p className="flex items-start" role="status" aria-label={`${card.name}: from ${price} ${card.unit}`}>
            <span aria-hidden="true" className="mr-1 mt-[0.12em] text-[clamp(40px,5.2vw,84px)] font-medium leading-none tracking-[-0.04em] text-muted">
              {symbol}
            </span>
            <span key={price} aria-hidden="true" className="step-swap text-[clamp(84px,14vw,224px)] font-semibold leading-[0.85] tracking-[-0.06em] tabular-nums">
              {amount}
            </span>
          </p>
          <p className="text-[17px] text-muted">
            Starting price, {card.unit}
            {plan && plan.gst_rate > 0 ? ` · + ${Math.round(plan.gst_rate * 100)}% GST at checkout` : ""}
          </p>
        </div>

        <div className="flex flex-col gap-8 lg:col-span-4 lg:row-start-2">
          <fieldset data-enter className="flex flex-col gap-3">
            <legend className="mb-3 text-[15px] text-muted">Engagement</legend>
            <div className="flex flex-wrap gap-2">
              {cards.map((c, i) => (
                <label key={c.name} className={pill(i === kind)}>
                  <input type="radio" name="kind" className="sr-only" checked={i === kind} onChange={() => setKind(i)} />
                  {c.name} · {c.tag.toLowerCase()}
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset data-enter className="flex flex-col gap-3">
            <legend className="mb-3 text-[15px] text-muted">Billed in</legend>
            <div className="flex flex-wrap gap-2">
              {REGIONS.map(([r, label]) => (
                <label key={r} className={pill(r === region)}>
                  <input type="radio" name="region" className="sr-only" checked={r === region} onChange={() => setRegion(r)} />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        <div data-enter className="flex flex-col gap-8 lg:col-span-7 lg:col-start-6 lg:row-start-2">
          <ul className="flex flex-col gap-2 text-[20px]">
            {card.features.slice(0, 4).map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
          <div className="flex flex-wrap items-center gap-3">
            {plan ? (
              <Button href={`/pricing/checkout?plan=${plan.id}`} variant="accent">
                {card.cta}
              </Button>
            ) : (
              <Button onClick={() => openContact()} variant="accent">
                {card.cta}
              </Button>
            )}
            <Button onClick={() => openContact(`Hi Gravityy team,\n\nI'm interested in the ${card.name} plan (from ${price} ${card.unit}).\n\nAbout the project:\n`)} variant="ghost">
              Talk to us first
            </Button>
          </div>
          <Link href="/pricing" className="w-fit text-[17px] font-medium underline decoration-fg/30 underline-offset-4 hover:decoration-accent">
            Compare plans or build a custom estimate
          </Link>
        </div>
      </div>
    </section>
  );
}
