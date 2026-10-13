import ResourcePage from "@/components/admin/ResourcePage";

export const metadata = { title: "Add-ons" };

export default function Page() {
  return <ResourcePage kind="addons" intro="Active add-ons are listed under the plans on /pricing for their region." />;
}
