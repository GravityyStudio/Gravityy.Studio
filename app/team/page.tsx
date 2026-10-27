import PageHero from "@/components/PageHero";
import JsonLd from "@/components/JsonLd";
import Button from "@/components/ui/Button";
import Team from "@/components/home/Team";
import { getContent } from "@/lib/content";
import { breadcrumbLd, pageMeta } from "@/lib/seo";

export const metadata = pageMeta("/team", "Our team", "The designers, engineers and automation specialists behind Gravityy Studio.");

export default async function TeamPage() {
  const { site } = await getContent();
  return (
    <main id="main">
      <JsonLd data={breadcrumbLd([["Team", "/team"]])} />
      <PageHero crumbs={[["Team", "/team"]]} title="Our team" lede="One team designs, builds and automates, so you deal with the same people from the first call to the last release." />
      <Team
        empty={
          <section className="container-x flex flex-col items-start gap-6 pb-[clamp(56px,8vh,96px)]">
            <p className="max-w-[48ch] text-[18px] text-fg/85">Team profiles are being added. Until then, the fastest way to meet us is a short call.</p>
            <Button href={`mailto:${site.email}`} variant="ghost">
              {site.email}
            </Button>
          </section>
        }
      />
    </main>
  );
}
