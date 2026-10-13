import CmsShapePage from "@/components/admin/CmsShapePage";

export const metadata = { title: "Typography" };

export default function Page() {
  return (
    <CmsShapePage
      entryKey="typography"
      title="Typography"
      intro="Largest size (px) of the home headline and section titles on wide screens, their weights (100–900) and letter spacing (em, e.g. -0.04). Sizes still scale down on phones."
    />
  );
}
