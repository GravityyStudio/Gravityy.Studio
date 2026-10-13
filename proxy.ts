import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { REGION_COOKIE, regionFromCountry } from "./lib/billing";
import { SUPABASE_ANON_KEY, SUPABASE_URL, supabaseConfigured } from "./lib/supabase/env";

// Edge proxy (diagram: "Edge proxy · proxy.ts · region + auth"). Mounted by middleware.ts on Next 15;
// on Next 16+ this file name is picked up directly.
const PROTECTED = ["/portal", "/admin", "/pricing/checkout"];
const AUTH_AWARE = [...PROTECTED, "/login"];
const under = (path: string, roots: string[]) => roots.some((r) => path === r || path.startsWith(r + "/"));

export async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;
  let res = NextResponse.next({ request: req });

  // 1) Region: country header from the edge (Vercel / Cloudflare) → sticky cookie → pricing tab + payment provider.
  const saved = req.cookies.get(REGION_COOKIE)?.value;
  const region = saved === "IN" || saved === "GLOBAL" ? saved : regionFromCountry(req.headers.get("x-vercel-ip-country") ?? req.headers.get("cf-ipcountry"));
  const setRegion = (r: NextResponse) => {
    if (saved !== region) r.cookies.set(REGION_COOKIE, region, { path: "/", maxAge: 60 * 60 * 24 * 30, sameSite: "lax" });
    return r;
  };

  // 2) Auth: only app routes touch Supabase, so marketing pages stay fully static/ISR.
  if (!under(path, AUTH_AWARE)) return setRegion(res);

  const toLogin = () => {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", path + req.nextUrl.search);
    return setRegion(NextResponse.redirect(url));
  };

  if (!supabaseConfigured) return under(path, PROTECTED) ? toLogin() : setRegion(res); // /login explains setup

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (list: { name: string; value: string; options: CookieOptions }[]) => {
        // Refreshed JWT cookies must reach both the downstream request and the browser.
        list.forEach(({ name, value }) => req.cookies.set(name, value));
        res = NextResponse.next({ request: req });
        list.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
      },
    },
  });

  // getUser() revalidates the JWT with Supabase Auth (getSession() would trust the cookie blindly).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && under(path, PROTECTED)) return toLogin();
  if (user && path === "/login") {
    const next = req.nextUrl.searchParams.get("next");
    const url = req.nextUrl.clone();
    url.pathname = next && next.startsWith("/") && !next.startsWith("//") ? next.split("?")[0] : "/portal";
    url.search = next?.includes("?") ? next.slice(next.indexOf("?")) : "";
    return setRegion(NextResponse.redirect(url));
  }
  return setRegion(res);
}
