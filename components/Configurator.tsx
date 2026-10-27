"use client";
import { useMemo, useRef, useState } from "react";
import { Check } from "lucide-react";
import { useContent } from "./ContentProvider";
import { estimateINR, fmtINR, fmtUSD, quoteMessage, recommend, toUSD, type Option } from "@/lib/pricing";
import { useEnter } from "@/hooks/useEnter";
import { useUI } from "./Providers";
import AnimatedNumber from "./ui/AnimatedNumber";
import Button from "./ui/Button";

const usd = (n: number) => "≈ " + fmtUSD(toUSD(n));

function Options({ legend, opts, value, onPick }: { legend: string; opts: Option[]; value: string; onPick: (id: string) => void }) {
  return (
    <fieldset>
      <legend className="mb-4 text-[17px] font-medium">{legend}</legend>
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
              className={`min-h-[64px] rounded-2xl p-3 text-left transition-colors duration-200 sm:p-4 ${on ? "bg-fg text-bg" : "bg-bg hover:bg-raised"}`}
            >
              <span className="block text-[15px] font-medium">{o.label}</span>
              <span className={`mt-1 block text-[13px] ${on ? "text-bg/70" : "text-muted"}`}>{o.hint}</span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

/** Live estimate: pick services, scope and timeline; the figure updates and becomes the quote. Same math as proposals. */
export default function Configurator() {
  const { services, configurator: cfg } = useContent();
  const ref = useRef<HTMLElement>(null);
  const { openContact } = useUI();
  const [sel, setSel] = useState<string[]>(cfg.defaults.sel);
  const [scope, setScope] = useState(cfg.defaults.scope);
  const [timeline, setTimeline] = useState(cfg.defaults.timeline);
  useEnter(ref);

  const scopeO = cfg.SCOPES.find((s) => s.id === scope)!;
  const tlO = cfg.TIMELINES.find((t) => t.id === timeline)!;
  const chosen = useMemo(() => services.filter((s) => sel.includes(s.id)), [sel, services]);
  const inr = estimateINR(chosen.map((s) => s.base), scopeO.m, tlO.m);
  const plan = recommend(sel, inr);
  const toggle = (id: string) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const quote = () => openContact(quoteMessage({ services: chosen.map((s) => s.name), scope: scopeO.label, timeline: tlO.label, inr, plan: plan.name }));

  return (
    <section ref={ref} id="configurator" aria-labelledby="config-h" className="bg-surface py-[clamp(80px,11vh,140px)]">
      <div className="container-x">
        <div data-enter className="flex flex-col gap-4">
          <h2 id="config-h" className="text-[clamp(28px,3vw,40px)] font-medium leading-tight tracking-[-0.03em]">
            Build your estimate
          </h2>
          <p className="max-w-[52ch] text-[17px] leading-relaxed">Pick what you need. The estimate updates as you go and becomes your quote.</p>
        </div>
        <div className="mt-12 grid items-start gap-10 lg:grid-cols-12 lg:gap-x-8">
          <div className="flex flex-col gap-10 lg:col-span-7" data-enter>
            <fieldset>
              <legend className="mb-4 text-[17px] font-medium">
                Services <span className="font-normal text-muted">(pick any)</span>
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
                      className={`inline-flex min-h-[44px] items-center gap-2 rounded-full px-4 text-[15px] transition-colors duration-200 ${on ? "bg-fg text-bg" : "bg-bg hover:bg-raised"}`}
                    >
                      {on && <Check size={14} aria-hidden="true" />}
                      {s.name}
                    </button>
                  );
                })}
              </div>
            </fieldset>
            <Options legend="Scope" opts={cfg.SCOPES} value={scope} onPick={setScope} />
            <Options legend="Timeline" opts={cfg.TIMELINES} value={timeline} onPick={setTimeline} />
          </div>

          <aside aria-label="Estimate" data-enter className="flex flex-col gap-6 rounded-card bg-bg p-7 sm:p-9 lg:sticky lg:top-28 lg:col-span-5">
            <p aria-live="polite" aria-atomic="true" className="sr-only">
              {`Estimate ${fmtINR(inr)}, ${usd(inr)}. Recommended plan: ${plan.name}.`}
            </p>
            <div className="flex flex-col gap-3">
              <p aria-hidden="true" className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                <AnimatedNumber value={inr} format={fmtINR} className="text-[clamp(40px,5.2vw,64px)] font-semibold leading-none tracking-[-0.045em] tabular-nums" />
                <AnimatedNumber value={inr} format={usd} className="text-[20px] text-muted" />
              </p>
              <p className="text-[15px] text-muted">
                {sel.length ? `Your estimate: ${sel.length} service${sel.length > 1 ? "s" : ""}, ${scopeO.label.toLowerCase()} scope, ${tlO.label.toLowerCase()} timeline` : "No services selected"}
              </p>
            </div>
            <div className="rounded-2xl bg-surface p-5">
              <p className="text-[15px] text-muted">Recommended plan</p>
              <p className="mt-1 text-[20px] font-medium tracking-[-0.02em]">{plan.name}</p>
              <p className="mt-2 text-[15px] leading-relaxed text-muted">{plan.why}</p>
            </div>
            <Button variant="accent" onClick={quote} disabled={!sel.length} className="w-full">
              Talk to us first
            </Button>
          </aside>
        </div>
      </div>
    </section>
  );
}
