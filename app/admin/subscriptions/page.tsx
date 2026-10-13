import ResourcePage from "@/components/admin/ResourcePage";

export const metadata = { title: "Subscriptions" };

export default function Page() {
  return <ResourcePage kind="subscriptions" intro="Retainers and monthly Grow plans. Paid monthly plans are added and renewed automatically by the payment webhooks; MRR on the overview counts active rows." />;
}
