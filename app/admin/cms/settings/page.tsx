import CmsShapePage from "@/components/admin/CmsShapePage";

export const metadata = { title: "Site settings" };

export default function Page() {
  return (
    <CmsShapePage
      entryKey="site"
      pick={["email", "social", "clientLoginHref", "stats", "metrics"]}
      title="Site settings"
      intro="Contact email, footer social links (LinkedIn, Instagram, X, GitHub, YouTube, Facebook or Dribbble get their icon), the client login link, the headline stats and the sample analytics dashboard numbers."
    />
  );
}
