import { requireAdmin } from "@/lib/auth";
import { SUPABASE_URL } from "@/lib/supabase/env";
import MediaLibrary, { type MediaItem } from "./MediaLibrary";

export const metadata = { title: "Media" };

export default async function MediaPage() {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase.storage.from("media").list("", { limit: 500, sortBy: { column: "created_at", order: "desc" } });
  const items: MediaItem[] = (data ?? [])
    .filter((o) => o.id) // folders have no id
    .map((o) => ({
      name: o.name,
      url: `${SUPABASE_URL}/storage/v1/object/public/media/${encodeURIComponent(o.name)}`,
      type: String(o.metadata?.mimetype ?? ""),
      size: Number(o.metadata?.size ?? 0),
    }));

  return (
    <div>
      <h2 className="text-2xl font-medium tracking-[-0.03em]">Media</h2>
      <p className="mt-2 max-w-[640px] text-[15px] leading-relaxed text-muted">
        Images and videos in Supabase Storage (public CDN URLs, up to 10 MB each). Copy a URL into a blog cover or any CMS field.
      </p>
      {error && <p role="alert" className="mt-4 text-sm text-danger">{error.message}</p>}
      <MediaLibrary items={items} />
    </div>
  );
}
