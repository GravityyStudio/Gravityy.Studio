"use client";
import { useEffect, useState } from "react";

export type NavViewer = { signedIn: true; name: string; href: string } | { signedIn: false };

/**
 * Signed-in state for the static site's nav. Asks /api/me only when a Supabase session cookie exists, so signed-out
 * visitors make no extra request. Re-checks on route change (signing in or out navigates).
 */
export function useViewer(path: string) {
  const [viewer, setViewer] = useState<NavViewer>({ signedIn: false });
  useEffect(() => {
    if (!document.cookie.includes("-auth-token")) return setViewer({ signedIn: false });
    const ctrl = new AbortController();
    fetch("/api/me", { signal: ctrl.signal, cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { signedIn: false }))
      .then(setViewer)
      .catch(() => {});
    return () => ctrl.abort();
  }, [path]);
  return viewer;
}
