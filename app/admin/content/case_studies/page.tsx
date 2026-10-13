import CmsShapePage from "@/components/admin/CmsShapePage";

export const metadata = { title: "Case studies" };

export default function Page() {
  return (
    <CmsShapePage
      entryKey="cases"
      title="Case studies"
      intro="Projects on /work and the home page, in this order. Live sites use url + tags; video case studies use metrics."
    />
  );
}
