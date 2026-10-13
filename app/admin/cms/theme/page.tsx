import CmsShapePage from "@/components/admin/CmsShapePage";

export const metadata = { title: "Theme" };

export default function Page() {
  return (
    <CmsShapePage
      entryKey="theme"
      title="Theme"
      intro="Accent colour for dark and light mode, and the corner radius of cards (px). Keep the light accent dark enough to read on white (4.5:1)."
    />
  );
}
