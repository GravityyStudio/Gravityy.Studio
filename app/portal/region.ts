import { cookies } from "next/headers";
import { REGION_COOKIE, type Region } from "@/lib/billing";

/** Billing region: the region cookie (edge proxy / Settings) wins over the profile default. */
export async function portalRegion(fallback: Region): Promise<Region> {
  const saved = (await cookies()).get(REGION_COOKIE)?.value;
  return saved === "IN" || saved === "GLOBAL" ? saved : fallback;
}
