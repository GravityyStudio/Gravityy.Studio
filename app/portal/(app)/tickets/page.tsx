import { requireUser } from "@/lib/auth";
import TicketList from "../../TicketList";

export const metadata = { title: "Support tickets" };

export default async function PortalTickets() {
  const { supabase } = await requireUser("/portal/tickets");
  return <TicketList supabase={supabase} kind="support" title="Support tickets" empty="No tickets. If something isn't working, open one and we'll reply here." />;
}
