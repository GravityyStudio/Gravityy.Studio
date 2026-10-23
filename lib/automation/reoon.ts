// PAID: Reoon email verification (https://emailverifier.reoon.com). Off until REOON_API_KEY is set, which needs
// the owner's approval. Disabled → null, and contacts keep email_status 'unverified'.

export type EmailStatus = "valid" | "risky" | "invalid" | "unknown";

export const reoonEnabled = () => Boolean(process.env.REOON_API_KEY);

const MAP: Record<string, EmailStatus> = {
  valid: "valid", safe: "valid",
  invalid: "invalid", disabled: "invalid", disposable: "invalid", spamtrap: "invalid",
  catch_all: "risky", role_account: "risky", inbox_full: "risky",
};

/** Reoon's raw status → our contacts.email_status vocabulary. */
export const mapReoonStatus = (s: unknown): EmailStatus => MAP[String(s).toLowerCase()] ?? "unknown";

export async function verifyEmail(email: string): Promise<EmailStatus | null> {
  const key = process.env.REOON_API_KEY;
  if (!key) return null;
  const url = `https://emailverifier.reoon.com/api/v1/verify?${new URLSearchParams({ email, key, mode: "quick" })}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`Reoon responded ${res.status}`);
  return mapReoonStatus(((await res.json()) as { status?: string }).status);
}
