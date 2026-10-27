"use client";
import { useEffect, useRef, useState } from "react";
import Link from "@/components/ui/SmartLink";
import { gsap } from "@/lib/gsap";
import { prefersReduced } from "@/lib/motion";
import { formatMinor, type Plan } from "@/lib/billing";
import { useContent } from "../ContentProvider";
import { useUI } from "../Providers";
import Button from "../ui/Button";

type Region = "india" | "intl";
type Kind = 0 | 1; // 0 = Build (one-time), 1 = Grow (monthly)

/** Segmented control on native radios: arrow keys move between options, the selected pill slides (transform only). */
function Segmented<T extends string | number>({
  legend,
  name,
  options,
  value,
  onChange,
}: {
  legend: string;
  name: string;
  options: [T, string][];
  value: T;
  onChange: (v: T) => void;
}) {
  const i = options.findIndex(([v]) => v === value);
  return (
    <fieldset>
      <legend className="mb-3 text-[15px] text-muted">{legend}</legend>
      <div className="relative grid grid-cols-2 rounded-pill bg-bg p-1 hairline">
        <span
          aria-hidden="true"
          className="absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-pill bg-fg transition-transform duration-500 ease-[cubic-bezier(.22,1,.36,1)]"
          style={{ transform: `translateX(${i * 100}%)` }}
        />
        {options.map(([v, label]) => (
          <label
            key={String(v)}
            className={`relative z-10 inline-flex min-h-[44px] cursor-pointer items-center justify-center rounded-pill px-4 text-center text-[15px] font-semibold transition-colors duration-300 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent ${v === value ? "text-bg" : "text-fg/80 hover:text-fg"}`}
          >
            <input type="radio" name={name} className="sr-only" checked={v === value} onChange={() => onChange(v)} />
            {label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/**
 * Pricing configurator: one-time or monthly, billed in INR or USD. The figure counts from the old price to the new one;
 * the included list redraws. Prices come from the plan rows checkout charges (CMS card text is only a fallback).
 * The other currency's starting price is shown alongside, so INR and USD are always visible together.
 */
export default function HomePricing() {
  const { pricing, plans } = useContent();
  const { openContact } = useUI();
  const [region, setRegion] = useState<Region>("india");
  const [kind, setKind] = useState<Kind>(0);
  const fig = useRef<HTMLSpanElement>(null);
  const shown = useRef<{ minor: number; currency: string } | null>(null);

  const planFor = (r: Region, k: Kind) => {
    const card = pricing[r][Math.min(k, pricing[r].length - 1)];
    const plan = (plans as Plan[]).find((p) => p.id === (card as { planId?: string }).planId && p.active);
    return { card, plan };
  };
  const { card, plan } = planFor(region, kind);
  const other = planFor(region === "india" ? "intl" : "india", kind).plan;
  const price = plan ? formatMinor(plan.amount_minor, plan.currency) : card.price;

  // Count the figure from the previously shown amount to the new one; a currency flip swaps instead of counting.
  useEffect(() => {
    const el = fig.current;
    if (!el || !plan) return;
    const from = shown.current;
    shown.current = { minor: plan.amount_minor, currency: plan.currency };
    if (!from || from.currency !== plan.currency || prefersReduced()) return void (el.textContent = price);
    const s = { v: from.minor };
    const tween = gsap.to(s, {
      v: plan.amount_minor,
      duration: 0.8,
      ease: "power3.out",
      onUpdate: () => void (el.textContent = formatMinor(Math.round(s.v / 100) * 100, plan.currency)),
      onComplete: () => void (el.textContent = price),
    });
    return () => void tween.kill();
  }, [plan, price]);

  return (
    <section id="pricing" data-glow aria-labelledby="pricing-h" className="py-[clamp(80px,11vh,140px)]">
      <div className="container-x">
        <div className="grid gap-6 lg:grid-cols-12 lg:items-end lg:gap-x-8">
          <h2 id="pricing-h" data-reveal className="display !text-[clamp(36px,5vw,80px)] lg:col-span-7">
            What it costs
          </h2>
          <p className="max-w-[46ch] text-fg/85 lg:col-span-5">
            A fixed price for a website build, or a monthly growth team after launch. Pick one to see the price and what is included.
          </p>
        </div>

        {/* Phones: choices → price → what is included. Desktop: choices and list on the left, price on the right. */}
        <div data-panel className="mt-12 grid gap-10 rounded-xl bg-surface p-6 hairline sm:p-10 lg:mt-16 lg:grid-cols-12 lg:gap-x-10">
          <div className="flex flex-col gap-8 lg:col-span-5 lg:row-start-1">
            <Segmented
              legend="Engagement"
              name="kind"
              options={
                [
                  [0, "One-time build"],
                  [1, "Monthly grow"],
                ] as [Kind, string][]
              }
              value={kind}
              onChange={setKind}
            />
            <Segmented
              legend="Currency"
              name="region"
              options={
                [
                  ["india", "INR ₹"],
                  ["intl", "USD $"],
                ] as [Region, string][]
              }
              value={region}
              onChange={setRegion}
            />
          </div>

          <div className="flex flex-col justify-between gap-8 lg:col-span-6 lg:col-start-7 lg:row-span-2 lg:row-start-1">
            <div className="flex flex-col gap-3">
              <p
                role="status"
                aria-label={`${card.name}: from ${price} ${card.unit}`}
                className="text-[clamp(64px,9vw,148px)] font-bold leading-[0.9] tracking-[-0.055em]"
              >
                <span ref={fig} aria-hidden="true" className="tabular-nums">
                  {price}
                </span>
              </p>
              <p className="text-muted">
                {card.name}, starting price {card.unit}
                {plan && plan.gst_rate > 0 ? ` · + ${Math.round(plan.gst_rate * 100)}% GST at checkout` : ""}
                {other ? ` · ${region === "india" ? "International" : "In India"}: from ${formatMinor(other.amount_minor, other.currency)}` : ""}
              </p>
            </div>
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
              <Button
                onClick={() =>
                  openContact(`Hi Gravityy team,\n\nI'm interested in the ${card.name} plan (from ${price} ${card.unit}).\n\nAbout the project:\n`)
                }
                variant="ghost"
              >
                Talk to us first
              </Button>
              <Link
                href="/pricing#configurator"
                className="inline-flex min-h-[44px] items-center px-2 font-semibold underline decoration-fg/30 underline-offset-4 hover:decoration-accent"
              >
                Build a custom estimate
              </Link>
            </div>
          </div>
          <ul className="flex flex-col gap-3 lg:col-span-5 lg:row-start-2" aria-label={`Included in ${card.name}`}>
            {card.features.map((f, i) => (
              <li key={`${kind}-${f}`} className="step-swap flex gap-3" style={{ animationDelay: `${i * 50}ms` }}>
                <span aria-hidden="true" className="mt-[10px] h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                {f}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
