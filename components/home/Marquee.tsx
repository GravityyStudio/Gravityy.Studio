import { getContent } from "@/lib/content";

/**
 * Skills and tools we build with (CMS → stack), as two rows drifting in opposite directions. CSS only: the list is
 * rendered twice and the track slides by half its width, so the loop is seamless. The second copy is hidden from
 * assistive tech; hover pauses it; reduced motion shows it static and wrapped.
 */
export default async function Marquee() {
  const { stack } = await getContent();
  const tools = stack.flatMap((g) => g.items);
  const skills = stack.map((g) => g.group);
  const row = (items: string[], reverse = false) => (
    <div className="marquee group flex overflow-hidden">
      {[0, 1].map((copy) => (
        <ul
          key={copy}
          aria-hidden={copy === 1 || undefined}
          className={`marquee-track flex shrink-0 items-center gap-3 pr-3 ${reverse ? "marquee-reverse" : ""}`}
        >
          {items.map((t) => (
            <li key={t} className="whitespace-nowrap rounded-pill px-5 py-2.5 text-[16px] text-fg/85 shadow-hairline">
              {t}
            </li>
          ))}
        </ul>
      ))}
    </div>
  );
  return (
    <section aria-labelledby="stack-h" className="overflow-hidden py-[clamp(40px,6vh,72px)]">
      <h2 id="stack-h" className="container-x mb-6 text-[15px] text-muted">
        Skills and tools we build with
      </h2>
      <div className="flex flex-col gap-3">
        {row(tools)}
        {row([...skills, "SEO", "Performance", "Accessibility", "UI/UX", "E-commerce", "CRM"], true)}
      </div>
    </section>
  );
}
