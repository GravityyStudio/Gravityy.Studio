"use client";
import { useState, type FormEvent } from "react";
import type * as Schemas from "@/lib/schemas";
import type { z } from "zod";

type Key = "contactSchema" | "auditSchema" | "newsletterSchema";
type Status = { ok: boolean; msg: string; pending: boolean; field?: string };

/**
 * Validates FormData with the shared zod schema client-side, then POSTs JSON to `endpoint`.
 * zod is imported on first submit so it stays out of the initial bundle.
 */
export function useFormSubmit<K extends Key>(endpoint: string, key: K, onSuccess?: (data: z.infer<(typeof Schemas)[K]>) => void) {
  const [status, setStatus] = useState<Status>({ ok: false, msg: "", pending: false });

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const raw = Object.fromEntries(new FormData(form).entries());
    const schema = (await import("@/lib/schemas"))[key];
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      setStatus({ ok: false, pending: false, msg: issue?.message ?? "Check the form.", field: String(issue?.path[0] ?? "") });
      return;
    }
    setStatus({ ok: false, msg: "Sending…", pending: true });
    try {
      const res = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(parsed.data) });
      const json = (await res.json()) as { ok: boolean; message?: string; error?: string };
      setStatus({ ok: json.ok, pending: false, msg: json.ok ? (json.message ?? "Sent.") : (json.error ?? "Something went wrong.") });
      if (json.ok) {
        form.reset();
        onSuccess?.(parsed.data as z.infer<(typeof Schemas)[K]>);
      }
    } catch {
      setStatus({ ok: false, pending: false, msg: "Network error. Try again or email hello@gravityystudio.com." });
    }
  }

  return { status, onSubmit, invalid: (name: string) => !status.ok && status.field === name };
}
