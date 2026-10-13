import ResourcePage from "@/components/admin/ResourcePage";

export const metadata = { title: "Tickets & requests" };

export default function Page() {
  return <ResourcePage kind="tickets" intro="Clients open tickets from their portal. Your response and status are shown back to them." />;
}
