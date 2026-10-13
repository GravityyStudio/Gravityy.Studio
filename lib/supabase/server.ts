import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./env";

/**
 * Per-request client bound to the visitor's JWT session cookies (Portal, Admin, Checkout, server actions).
 * Every query runs as that user, so Postgres RLS decides what they can read or write.
 */
export async function createSupabaseServer() {
  const store = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list: { name: string; value: string; options: CookieOptions }[]) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // Called from a Server Component (read-only cookies). The edge proxy refreshes sessions, so this is safe to ignore.
        }
      },
    },
  });
}
