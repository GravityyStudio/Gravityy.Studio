import { requireUser } from "@/lib/auth";
import { getContent } from "@/lib/content";
import TicketList from "../../TicketList";

export const metadata = { title: "Service requests" };

export default async function PortalRequests() {
  const [{ supabase }, { services }] = await Promise.all([requireUser("/portal/requests"), getContent()]);
  return (
    <TicketList
      supabase={supabase}
      kind="request"
      title="Service requests"
      empty="No requests yet. Need a new page, feature or campaign? Tell us what you need and we'll reply with a plan and estimate."
      services={services.map((s) => s.name)}
    />
  );
}
