import { createHash } from "node:crypto";
import { createSupabaseService } from "./supabase/service";

/** sha256 hex. Rate-limit buckets never hold raw IPs or email addresses. */
export const hashKey = (value: string) => createHash("sha256").update(value).digest("hex");

/** First hop of x-forwarded-for (set by Vercel's edge), else x-real-ip. */
export const clientIp = (req: Request) => req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || null;

/**
 * Shared fixed-window limiter (Postgres `rate_limit_hit`, service role only), so limits hold across serverless instances.
 * Fails open: if the database is unreachable the request is allowed and the outage is logged, because losing a
 * real enquiry costs more than letting a few extra requests through.
 */
export async function allow(bucket: string, max: number, windowSeconds: number): Promise<boolean> {
  try {
    const { data, error } = await createSupabaseService().rpc("rate_limit_hit", { p_bucket: bucket, p_max: max, p_window_s: windowSeconds });
    if (error) throw error;
    return data !== false;
  } catch (e) {
    console.error("[rate-limit] unavailable, allowing request:", e instanceof Error ? e.message : e);
    return true;
  }
}
