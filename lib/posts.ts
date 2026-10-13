import { cache } from "react";
import { publicClient } from "./content";
import { supabaseConfigured } from "./supabase/env";

export type Post = { slug: string; title: string; excerpt: string | null; cover_url: string | null; body: string; published_at: string | null; updated_at: string };

const COLS = "slug, title, excerpt, cover_url, published_at, updated_at";

/** Published posts, newest first (RLS: anon reads published only). Empty when Supabase isn't configured or is down. */
export const getPosts = cache(async (): Promise<Omit<Post, "body">[]> => {
  if (!supabaseConfigured) return [];
  const { data, error } = await publicClient().from("posts").select(COLS).eq("published", true).order("published_at", { ascending: false }).limit(100);
  if (error) console.error("[blog]", error.message);
  return data ?? [];
});

export const getPost = cache(async (slug: string): Promise<Post | null> => {
  if (!supabaseConfigured || !/^[a-z0-9-]{1,120}$/.test(slug)) return null;
  const { data } = await publicClient().from("posts").select(`${COLS}, body`).eq("slug", slug).eq("published", true).maybeSingle<Post>();
  return data;
});

export const postDate = (p: Pick<Post, "published_at" | "updated_at">) =>
  new Date(p.published_at ?? p.updated_at).toLocaleDateString("en-IN", { dateStyle: "long", timeZone: "Asia/Kolkata" });
