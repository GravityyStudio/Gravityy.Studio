import type { NextRequest } from "next/server";
import { proxy } from "./proxy";

// Next 15 entry point for the edge proxy (Next 16 renames this convention to proxy.ts).
export function middleware(req: NextRequest) {
  return proxy(req);
}

// Pages only: skip Next internals, API routes (webhooks verify their own signatures) and static files.
export const config = {
  matcher: ["/((?!_next/|api/|media/|brand/|favicon|icon|apple-icon|opengraph-image|robots\\.txt|sitemap\\.xml|manifest\\.webmanifest|.*\\.(?:png|jpg|jpeg|svg|webp|avif|gif|mp4|webm|ico|txt|xml)$).*)"],
};
