"use client";
import { createContext, useContext, type ReactNode } from "react";
import type { Content } from "@/lib/content";

// CMS content fetched once on the server (lib/content.ts → rpc cms_published_all) and shared with client sections.
const Ctx = createContext<Content | null>(null);

export function ContentProvider({ value, children }: { value: Content; children: ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useContent() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useContent must be used inside <ContentProvider>");
  return c;
}
