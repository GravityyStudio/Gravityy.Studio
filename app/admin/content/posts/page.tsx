import ResourcePage from "@/components/admin/ResourcePage";

export const metadata = { title: "Blog" };

export default function Page() {
  return <ResourcePage kind="posts" intro="Published posts appear on /blog within seconds." />;
}
