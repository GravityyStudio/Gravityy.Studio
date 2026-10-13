"use client";
import { useMemo, useRef, useState } from "react";
import { Check } from "lucide-react";
import { useContent } from "./ContentProvider";
import { estimateINR, fmtINR, fmtUSD, quoteMessage, recommend, toUSD, type Option } from "@/lib/pricing";
import { useReveal } from "@/hooks/useReveal";
import { useUI } from "./Providers";
import SectionHeading from "./ui/SectionHeading";
import AnimatedNumber from "./ui/AnimatedNumber";
import Button from "./ui/Button";

const usd = (n: number) => "≈ " + fmtUSD(toUSD(n));

function Options({ legend, n, opts, value, onPick }: { legend: string; n: number; opts: Option[]; value: string; onPick: (id: string) => void }) {
  return (
    <fieldset>
      <legend className="mb-4 text-[15px] font-medium">
        <span className="mr-3 font-mono text-muted">{n}</span>
        {legend}
      </legend>
      <div role="radiogroup" aria-label={legend} className="grid grid-cols-3 gap-2">
        {opts.map((o) => {
          const on = value === o.id;
          return (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onPick(o.id)}
              className={`min-h-[64px] rounded-2xl border p-3 text-left transition-colors duration-200 sm:p-4 ${on ? "border-fg/70 bg-fg/[0.06]" : "border-line hover:border-line-strong"}`}
            >
              <span className="block text-[15px] font-medium">{o.label}</span>
              <span className="mt-1 block text-[13px] text-muted">{o.hint}</span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export default function Configurator() {
  const { services, configurator: cfg } = useContent();
  const ref = useRef<HTMLElement>(null);
  const { openContact } = useUI();
  const [sel, setSel] = useState<string[]>(cfg.defaults.sel);
  const [scope, setScope] = useState(cfg.defaults.scope);
  const [timeline, setTimeline] = useState(cfg.defaults.timeline);
  useReveal(ref);

  const scopeO = cfg.SCOPES.find((s) => s.id === scope)!;
  const tlO = cfg.TIMELINES.find((t) => t.id === timeline)!;
  const chosen = useMemo(() => services.filter((s) => sel.includes(s.id)), [sel, services]);
  const inr = estimateINR(chosen.map((s) => s.base), scopeO.m, tlO.m);
  const plan = recommend(sel, inr);
  const toggle = (id: string) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const quote = () => openContact(quoteMessage({ services: chosen.map((s) => s.name), scope: scopeO.label, timeline: tlO.label, inr, plan: plan.name }));

  return (
    <section ref={ref} id="configurator" aria-labelledby="config-h" className="section cv">
      <div className="container-x">
        <SectionHeading id="config-h" index="03" eyebrow="Estimate" title="Build your digital system." lede="Pick what you need. The estimate updates as you go and becomes your quote." />
        <div className="mt-10 grid items-start gap-10 lg:grid-cols-[1.25fr_1fr] lg:gap-12">
          <div className="flex flex-col gap-10" data-card>
            <fieldset>
              <legend className="mb-4 text-[15px] font-medium">
                <span className="mr-3 font-mono text-muted">1</span>Services <span className="font-normal text-muted">— pick any</span>
              </legend>
              <div className="flex flex-wrap gap-2">
                {services.map((s) => {
                  const on = sel.includes(s.id);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggle(s.id)}
                      className={`inline-flex min-h-[44px] items-center gap-2 rounded-full border px-4 text-sm transition-colors duration-200 ${on ? "border-fg bg-fg text-bg" : "border-line-strong hover:border-fg/60"}`}
                    >
                      {on && <Check size={14} aria-hidden="true" />}
                      {s.name}
                    </button>
                  );
                })}
              </div>
            </fieldset>
            <Options legend="Scope" n={2} opts={cfg.SCOPES} value={scope} onPick={setScope} />
            <Options legend="Timeline" n={3} opts={cfg.TIMELINES} value={timeline} onPick={setTimeline} />
          </div>

          <aside aria-label="Estimate" data-card className="glass flex flex-col gap-6 rounded-card border border-line p-7 sm:p-9 lg:sticky lg:top-28">
            <p className="font-mono text-xs uppercase tracking-[0.14em] text-muted">Live estimate</p>
            <p aria-live="polite" aria-atomic="true" className="sr-only">
              {`Estimate ${fmtINR(inr)}, ${usd(inr)}. Recommended plan: ${plan.name}.`}
            </p>
            <div className="flex flex-col gap-6">
              <p aria-hidden="true" className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                <AnimatedNumber value={inr} format={fmtINR} className="text-[clamp(40px,5vw,60px)] font-medium leading-none tracking-[-0.04em]" />
                <AnimatedNumber value={inr} format={usd} className="text-xl text-muted" />
              </p>
              <p className="text-sm text-muted">
                {sel.length ? `${sel.length} service${sel.length > 1 ? "s" : ""} · ${scopeO.label} scope · ${tlO.label} timeline` : "No services selected"}
              </p>
              <div className="border-t border-line pt-6">
                <p className="mb-2 font-mono text-xs uppercase tracking-[0.14em] text-muted">Recommended plan</p>
                <p className="text-xl font-medium tracking-[-0.02em]">{plan.name}</p>
                <p className="mt-2 text-sm leading-relaxed text-muted">{plan.why}</p>
              </div>
            </div>
            <Button variant="accent" onClick={quote} disabled={!sel.length} className="w-full">
              Get as a quote
            </Button>
          </aside>
        </div>
      </div>
    </section>
  );
}
