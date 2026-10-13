import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "@/components/ui/SmartLink";
import { requireAdmin } from "@/lib/auth";
import { CMS_KEYS, LOCAL, type CmsKey } from "@/lib/content";
import CmsEditor from "./CmsEditor";

export async function generateMetadata({ params }: { params: Promise<{ key: string }> }) {
  return { title: `CMS · ${(await params).key}` };
}

export default async function CmsEntryPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  if (!(CMS_KEYS as readonly string[]).includes(key)) notFound();
  const { supabase } = await requireAdmin();
  const { data } = await supabase.from("cms_entries").select("value, published").eq("key", key).maybeSingle<{ value: unknown; published: boolean }>();
  const value = data?.value ?? LOCAL[key as CmsKey];

  return (
    <div>
      <Link href="/admin/cms/json" className="mb-6 inline-flex min-h-[44px] items-center gap-2 text-sm text-muted hover:text-fg">
        <ArrowLeft size={16} aria-hidden="true" /> All entries
      </Link>
      <CmsEditor entryKey={key} initial={JSON.stringify(value, null, 2)} published={data?.published ?? true} fromDb={Boolean(data)} />
    </div>
  );
}
