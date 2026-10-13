import ResourcePage from "@/components/admin/ResourcePage";

export const metadata = { title: "Projects" };

export default function Page() {
  return <ResourcePage kind="projects" intro="Clients see their own projects, status and progress in the portal." />;
}
