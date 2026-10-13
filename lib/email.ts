// Resend (diagram: "Resend · transactional email"). With RESEND_API_KEY unset, emails are logged instead of sent.

type Mail = { to?: string; subject: string; text: string; html?: string };

async function send({ to, subject, text, html }: Mail) {
  const key = process.env.RESEND_API_KEY;
  const recipient = to ?? process.env.EMAIL_TO ?? "hello@gravityystudio.com";
  if (!key) {
    console.info(`[email stub] to=${recipient} · ${subject}\n${text}`);
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: process.env.EMAIL_FROM ?? "Gravityy Studio <noreply@gravityystudio.com>", to: recipient, subject, text, html }),
  });
  if (!res.ok) throw new Error(`Email provider responded ${res.status}`);
}

/** Internal notification for site forms (contact, audit, newsletter). */
export async function sendEmail(subject: string, fields: Record<string, string>) {
  const text = Object.entries(fields)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");
  await send({ subject, text });
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Customer invoice email, sent by the webhook route after a verified payment. */
export async function sendInvoiceEmail(inv: { to: string; number: number; planName: string; lines: [string, string][]; total: string; url: string }) {
  const rows = inv.lines.map(([k, v]) => `<tr><td style="padding:6px 0;color:#555">${esc(k)}</td><td style="padding:6px 0;text-align:right">${esc(v)}</td></tr>`).join("");
  const html = `<div style="font-family:system-ui,sans-serif;max-width:520px;margin:auto;color:#0e0e0e">
  <p style="font-size:13px;letter-spacing:.12em;text-transform:uppercase;color:#4d7c0f">Gravityy Studio</p>
  <h1 style="font-size:22px;margin:8px 0 4px">Invoice #${inv.number}</h1>
  <p style="color:#555;margin:0 0 20px">Thanks for your payment for <strong>${esc(inv.planName)}</strong>.</p>
  <table style="width:100%;border-collapse:collapse;border-top:1px solid #e2e2dc">${rows}
  <tr><td style="padding:10px 0;border-top:1px solid #e2e2dc"><strong>Total paid</strong></td><td style="padding:10px 0;border-top:1px solid #e2e2dc;text-align:right"><strong>${esc(inv.total)}</strong></td></tr></table>
  <p style="margin-top:24px"><a href="${esc(inv.url)}" style="background:#0e0e0e;color:#fff;padding:12px 18px;border-radius:999px;text-decoration:none">View invoice</a></p>
</div>`;
  const text = `Invoice #${inv.number} — ${inv.planName}\n${inv.lines.map(([k, v]) => `${k}: ${v}`).join("\n")}\nTotal paid: ${inv.total}\n${inv.url}`;
  await send({ to: inv.to, subject: `Your Gravityy Studio invoice #${inv.number}`, text, html });
}
