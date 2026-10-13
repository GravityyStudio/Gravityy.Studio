// Billing primitives shared by marketing cards, checkout, webhooks and invoices. No imports → safe in client bundles.

export type Region = "IN" | "GLOBAL";
export type Plan = {
  id: string;
  name: string;
  region: Region;
  currency: "INR" | "USD";
  amount_minor: number; // paise / cents, before tax
  interval: "one_time" | "month";
  gst_rate: number; // 0.18 for India, 0 for global
  active: boolean;
  sort: number;
};

export type Addon = { id: string; name: string; description: string | null; price_minor: number; currency: "INR" | "USD"; region: Region };

/** Diagram: IN billing → Razorpay (INR + GST), GLOBAL billing → Stripe (USD). */
export const providerFor = (region: Region) => (region === "IN" ? "razorpay" : "stripe");

export function planTotals(p: Pick<Plan, "amount_minor" | "gst_rate">) {
  const tax = Math.round(p.amount_minor * p.gst_rate);
  return { subtotal: p.amount_minor, tax, total: p.amount_minor + tax };
}

export function formatMinor(minor: number, currency: string) {
  return new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: minor % 100 ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(minor / 100);
}

export const REGION_COOKIE = "region";
/** Country → billing region. India (and unknown, e.g. localhost) bills in INR; everyone else in USD. */
export const regionFromCountry = (country?: string | null): Region => (!country || country.toUpperCase() === "IN" ? "IN" : "GLOBAL");
