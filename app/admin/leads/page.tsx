import ResourcePage from "@/components/admin/ResourcePage";

export const metadata = { title: "Leads" };

export default function Page() {
  return <ResourcePage kind="leads" intro="Contact and audit forms on the site create leads automatically. Drag cards between stages, or use the stage menu on each card." />;
}
