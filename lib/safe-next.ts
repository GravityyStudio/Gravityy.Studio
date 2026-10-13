/** Only same-site relative paths are allowed as post-login destinations (prevents open redirects like //evil.com). */
export function safeNext(next: string | null | undefined, fallback = "/portal") {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}
