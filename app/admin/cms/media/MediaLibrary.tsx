"use client";
import { useActionState, useState } from "react";
import { Check, Copy, Trash2, Upload } from "lucide-react";
import Button from "@/components/ui/Button";
import type { Result } from "@/app/admin/actions";
import { deleteMedia, uploadMedia } from "./actions";

export type MediaItem = { name: string; url: string; type: string; size: number };

const kb = (n: number) => (n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

function Tile({ item }: { item: MediaItem }) {
  const [copied, setCopied] = useState(false);
  const [state, action, pending] = useActionState<Result, FormData>(deleteMedia, {});
  const copy = async () => {
    await navigator.clipboard.writeText(item.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <li className="card overflow-hidden">
      <div className="aspect-[4/3] bg-raised">
        {item.type.startsWith("video/") ? (
          <video src={item.url} muted playsInline preload="metadata" className="h-full w-full object-cover" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- admin thumbnails from any uploaded format, incl. SVG
          <img src={item.url} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
        )}
      </div>
      <div className="flex flex-col gap-3 p-4">
        <p className="truncate text-sm font-medium" title={item.name}>
          {item.name}
        </p>
        <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-muted">
          {item.type.split("/")[1] ?? "file"} · {kb(item.size)}
        </p>
        <div className="flex gap-2">
          <button onClick={copy} className="inline-flex min-h-[40px] flex-1 items-center justify-center gap-2 rounded-full border border-line text-sm transition-colors hover:border-fg/50">
            {copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
            {copied ? "Copied" : "Copy URL"}
          </button>
          <form action={action} onSubmit={(e) => !confirm(`Delete ${item.name}? Pages using it will show a broken image.`) && e.preventDefault()}>
            <input type="hidden" name="name" value={item.name} />
            <button type="submit" disabled={pending} aria-label={`Delete ${item.name}`} className="grid h-10 w-10 place-items-center rounded-full border border-line text-danger transition-colors hover:border-danger/60">
              <Trash2 size={14} aria-hidden="true" />
            </button>
          </form>
        </div>
        {state.error && <p role="alert" className="text-[13px] text-danger">{state.error}</p>}
      </div>
    </li>
  );
}

export default function MediaLibrary({ items }: { items: MediaItem[] }) {
  const [state, action, pending] = useActionState<Result, FormData>(uploadMedia, {});
  return (
    <>
      <form action={action} className="card mt-6 flex flex-col gap-4 border-dashed p-5 sm:flex-row sm:items-center">
        <label className="flex flex-1 flex-col gap-2 text-sm font-medium">
          Upload files
          <input name="files" type="file" multiple required accept="image/jpeg,image/png,image/webp,image/avif,image/gif,image/svg+xml,video/mp4,video/webm" className="text-sm file:mr-4 file:min-h-[40px] file:cursor-pointer file:rounded-full file:border file:border-line file:bg-bg file:px-4 file:text-fg" />
        </label>
        <Button type="submit" variant="accent" disabled={pending}>
          <Upload size={16} aria-hidden="true" /> {pending ? "Uploading…" : "Upload"}
        </Button>
        <p role="status" className={`text-sm sm:max-w-[240px] ${state.error ? "text-danger" : "text-accent"}`}>
          {state.error ?? (state.ok ? "Uploaded." : "")}
        </p>
      </form>
      <ul className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((it) => (
          <Tile key={it.name} item={it} />
        ))}
      </ul>
      {!items.length && <p className="mt-8 text-center text-sm text-muted">No media yet.</p>}
    </>
  );
}
