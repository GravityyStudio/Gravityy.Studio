import type { ReactNode } from "react";

// Tiny Markdown subset → React elements (never raw HTML, so post bodies can't inject markup or scripts).
// Blocks: #/##/### headings, - or * lists, 1. lists, > quotes, ``` code fences, paragraphs.
// Inline: **bold**, *italic*, `code`, [text](https://… | /path | mailto:…).

const SAFE_URL = /^(https?:\/\/|\/(?!\/)|mailto:)/i;
const INLINE = /(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|`[^`]+`|\[[^\]]+\]\([^)\s]+\))/g;

function inline(text: string): ReactNode[] {
  return text.split(INLINE).map((t, i) => {
    if (t.startsWith("**") && t.endsWith("**") && t.length > 4) return <strong key={i}>{t.slice(2, -2)}</strong>;
    if (t.startsWith("`") && t.endsWith("`") && t.length > 2) return <code key={i} className="rounded bg-raised px-1.5 py-0.5 font-mono text-[0.9em]">{t.slice(1, -1)}</code>;
    const link = t.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
    if (link) {
      const [, label, href] = link;
      if (!SAFE_URL.test(href)) return label;
      const ext = /^https?:/i.test(href);
      return (
        <a key={i} href={href} className="text-accent underline underline-offset-4" {...(ext ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
          {label}
        </a>
      );
    }
    if (t.startsWith("*") && t.endsWith("*") && t.length > 2) return <em key={i}>{t.slice(1, -1)}</em>;
    return t;
  });
}

export default function Markdown({ source }: { source: string }) {
  const out: ReactNode[] = [];
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  for (let i = 0; i < lines.length; ) {
    const line = lines[i];
    const k = out.length;
    if (!line.trim()) {
      i++;
    } else if (line.startsWith("```")) {
      const code: string[] = [];
      for (i++; i < lines.length && !lines[i].startsWith("```"); i++) code.push(lines[i]);
      i++;
      out.push(<pre key={k} className="overflow-x-auto rounded-2xl border border-line bg-sunken p-5 font-mono text-[14px] leading-relaxed"><code>{code.join("\n")}</code></pre>);
    } else if (/^#{1,3} /.test(line)) {
      const level = line.indexOf(" ");
      const text = inline(line.slice(level + 1));
      out.push(level === 1 ? <h2 key={k} className="mt-6 text-3xl font-medium">{text}</h2> : level === 2 ? <h2 key={k} className="mt-6 text-2xl font-medium">{text}</h2> : <h3 key={k} className="mt-4 text-xl font-medium">{text}</h3>);
      i++;
    } else if (/^([-*]|\d+\.) /.test(line)) {
      const ordered = /^\d/.test(line);
      const items: string[] = [];
      for (; i < lines.length && (ordered ? /^\d+\. / : /^[-*] /).test(lines[i]); i++) items.push(lines[i].replace(/^([-*]|\d+\.) /, ""));
      const List = ordered ? "ol" : "ul";
      out.push(<List key={k} className={`flex flex-col gap-2 pl-6 ${ordered ? "list-decimal" : "list-disc"} marker:text-muted`}>{items.map((t, j) => <li key={j}>{inline(t)}</li>)}</List>);
    } else if (line.startsWith("> ")) {
      const q: string[] = [];
      for (; i < lines.length && lines[i].startsWith("> "); i++) q.push(lines[i].slice(2));
      out.push(<blockquote key={k} className="border-l-2 border-accent pl-5 text-xl leading-relaxed text-fg/90">{inline(q.join(" "))}</blockquote>);
    } else {
      const p: string[] = [];
      for (; i < lines.length && lines[i].trim() && !/^(#{1,3} |```|> |[-*] |\d+\. )/.test(lines[i]); i++) p.push(lines[i]);
      out.push(<p key={k}>{inline(p.join(" "))}</p>);
    }
  }
  return <div className="flex flex-col gap-6 text-[16px] leading-[1.75] text-fg/85">{out}</div>;
}
