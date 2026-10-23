import { prospectInputSchema, splitList, toProspectFields, type ProspectFields } from "./prospect";

// CSV import for company prospects. Company-level columns only: files with personal contact columns
// (email, phone, person names, LinkedIn profiles…) are refused outright rather than silently stripped,
// so nobody imports personal data by accident without a lawful basis.

export const CSV_MAX_BYTES = 1_000_000;
export const CSV_MAX_ROWS = 1000;

const COLUMN_ALIASES: Record<string, string> = {
  name: "name", company: "name", company_name: "name", business: "name", business_name: "name",
  website: "website", url: "website", domain: "website", site: "website",
  industry: "industry", sector: "industry",
  category: "category", business_category: "category", type: "category",
  city: "city", town: "city",
  region: "region", state: "region", province: "region",
  country: "country", country_code: "country",
  size: "size_band", size_band: "size_band", employees: "size_band", company_size: "size_band",
  intent: "intent_signals", intent_signals: "intent_signals", signals: "intent_signals",
  notes: "notes", note: "notes",
};
const PERSONAL_RE = /^(e_?mail|email_address|work_email|phone|phone_number|mobile|telephone|tel|whatsapp|first_?name|last_?name|full_?name|surname|contact|contact_name|contact_person|person|owner_name|linkedin|linkedin_url|twitter|instagram_handle|date_of_birth|dob|address_line|home_address)$/;

/** RFC 4180 parser: quoted fields, escaped quotes, commas and newlines inside quotes, CRLF or LF. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const src = text.replace(/^﻿/, "");
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"' && field === "") quoted = true;
    else if (ch === ",") { row.push(field); field = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(field); rows.push(row); row = []; field = "";
    } else field += ch;
  }
  if (quoted) throw new Error("Unclosed quote in the CSV file.");
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

const headerKey = (h: string) => h.trim().toLowerCase().replace(/[\s-]+/g, "_").replace(/[^a-z0-9_]/g, "");

export type CsvImport = { rows: ProspectFields[]; errors: { row: number; message: string }[]; ignoredColumns: string[]; duplicatesInFile: number };

/** Validates a whole file. Throws only for file-level problems (size, personal columns, missing name column). */
export function readProspectsCsv(text: string): CsvImport {
  if (new TextEncoder().encode(text).byteLength > CSV_MAX_BYTES) throw new Error(`The file is larger than ${CSV_MAX_BYTES / 1_000_000} MB.`);
  const [header, ...data] = parseCsv(text);
  if (!header) throw new Error("The file is empty.");
  const keys = header.map(headerKey);
  const personal = header.filter((_, i) => PERSONAL_RE.test(keys[i]));
  if (personal.length) {
    throw new Error(`This file has personal contact columns (${personal.join(", ")}). Discovery imports company data only; remove those columns and try again.`);
  }
  const mapped = keys.map((k) => COLUMN_ALIASES[k] ?? null);
  if (!mapped.includes("name")) throw new Error("The file needs a company name column (name or company).");
  if (data.length > CSV_MAX_ROWS) throw new Error(`The file has ${data.length} rows; the limit is ${CSV_MAX_ROWS} per import.`);

  const rows: ProspectFields[] = [];
  const errors: CsvImport["errors"] = [];
  const seen = new Set<string>();
  let duplicatesInFile = 0;
  data.forEach((cells, index) => {
    const raw: Record<string, string> = {};
    mapped.forEach((field, i) => { if (field && cells[i] !== undefined && raw[field] === undefined) raw[field] = cells[i]; });
    const parsed = prospectInputSchema.safeParse({ ...raw, intent_signals: splitList(raw.intent_signals) });
    if (!parsed.success) {
      errors.push({ row: index + 2, message: parsed.error.issues[0]?.message ?? "Invalid row." });
      return;
    }
    const fields = toProspectFields(parsed.data);
    const key = fields.domain ?? `name:${fields.name.toLowerCase()}`;
    if (seen.has(key)) { duplicatesInFile++; return; }
    seen.add(key);
    rows.push(fields);
  });
  return { rows, errors, ignoredColumns: header.filter((_, i) => !mapped[i]), duplicatesInFile };
}
