import type { ReactNode } from "react";

/** Responsive table: horizontal scroll on phones, sticky header row; rows rise in one after another and tint on hover. */
export default function DataTable({ head, children, empty }: { head: string[]; children: ReactNode; empty?: ReactNode }) {
  return (
    <div className="card overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="border-b border-line">
            {head.map((h) => (
              <th key={h} scope="col" className="px-5 py-4 font-mono text-[11px] font-normal uppercase tracking-[0.12em] text-muted">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="stagger [&>tr:not(:last-child)]:border-b [&>tr]:border-line [&>tr]:transition-colors [&>tr:hover]:bg-fg/[0.03]">{children}</tbody>
      </table>
      {empty}
    </div>
  );
}
