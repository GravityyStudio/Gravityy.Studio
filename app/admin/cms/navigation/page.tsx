import CmsShapePage from "@/components/admin/CmsShapePage";

export const metadata = { title: "Menu" };

export default function Page() {
  return <CmsShapePage entryKey="site" pick={["NAV", "FOOTER"]} title="Menu" intro="Main navigation links and the footer link columns. Use /paths for pages, full URLs for other sites." />;
}
