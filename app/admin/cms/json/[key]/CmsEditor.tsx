"use client";
import { useActionState, useMemo, useState } from "react";
import { saveCms, type Result } from "@/app/admin/actions";
import Button from "@/components/ui/Button";

/** JSON editor with live validation, format button, publish toggle. Saved through RLS (admin only). */
export default function CmsEditor({ entryKey, initial, published, fromDb }: { entryKey: string; initial: string; published: boolean; fromDb: boolean }) {
  const [text, setText] = useState(initial);
  const [state, action, pending] = useActionState<Result, FormData>(saveCms, {});
  const parseError = useMemo(() => {
    try {
      JSON.parse(text);
      return "";
    } catch (e) {
      return e instanceof Error ? e.message : "Invalid JSON";
    }
  }, [text]);

  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="key" value={entryKey} />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-mono text-2xl">{entryKey}</h2>
          <p className="mt-1 text-sm text-muted">{fromDb ? "Stored in Supabase." : "Not in the CMS yet: showing the local default. Saving creates it."}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 text-sm">
            <input type="checkbox" name="published" defaultChecked={published} className="h-4 w-4 accent-[rgb(var(--accent))]" />
            Published
          </label>
          <button
            type="button"
            onClick={() => !parseError && setText(JSON.stringify(JSON.parse(text), null, 2))}
            className="inline-flex min-h-[44px] items-center rounded-full border border-line px-4 text-sm transition-colors hover:border-fg/50"
          >
            Format
          </button>
          <Button type="submit" variant="accent" disabled={pending || Boolean(parseError)}>
            {pending ? "Saving…" : "Save & publish"}
          </Button>
        </div>
      </div>
      <textarea
        name="value"
        value={text}
        onChange={(e) => setText(e.target.value)}
        spellCheck={false}
        data-lenis-prevent
        aria-label={`${entryKey} JSON`}
        aria-invalid={Boolean(parseError)}
        className="field min-h-[60svh] resize-y font-mono text-[13px] leading-relaxed"
      />
      <p role="status" className={`min-h-5 text-sm ${parseError || state.error ? "text-danger" : "text-accent"}`}>
        {parseError ? `JSON: ${parseError}` : (state.error ?? (state.ok ? "Saved. The live site is updated." : ""))}
      </p>
    </form>
  );
}
