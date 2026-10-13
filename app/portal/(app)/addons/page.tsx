import { Puzzle } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { formatMinor, type Addon } from "@/lib/billing";
import AddonRequest from "../../AddonRequest";
import { portalRegion } from "../../region";

export const metadata = { title: "Add-ons" };

/** Active add-ons for the client's billing region. "Request" opens a service request; the studio confirms scope before billing. */
export default async function PortalAddons() {
  const { supabase, profile } = await requireUser("/portal/addons");
  const region = await portalRegion(profile.region);
  const { data: addons } = await supabase.from("addons").select("id, name, description, price_minor, currency, region").eq("active", true).eq("region", region).order("sort").returns<Addon[]>();

  return (
    <div>
      <p className="mb-6 max-w-[640px] text-[15px] leading-relaxed text-muted">
        Extras you can add to your plan. Requesting one sends us a service request; we confirm the scope before anything is billed.
      </p>
      {addons?.length ? (
        <ul className="grid gap-4 sm:grid-cols-2">
          {addons.map((a, i) => (
            <li key={a.id} className="card rise flex flex-col gap-4 p-6" style={{ animationDelay: `${i * 50}ms` }}>
              <div className="flex items-start justify-between gap-4">
                <h2 className="text-lg font-medium">{a.name}</h2>
                <p className="shrink-0 text-lg font-medium tabular-nums">+{formatMinor(a.price_minor, a.currency)}</p>
              </div>
              {a.description && <p className="text-[15px] leading-relaxed text-muted">{a.description}</p>}
              <div className="mt-auto">
                <AddonRequest id={a.id} name={a.name} />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="card flex flex-col items-center gap-3 px-6 py-16 text-center text-muted">
          <Puzzle size={24} aria-hidden="true" />
          No add-ons are available for your region right now.
        </div>
      )}
    </div>
  );
}
