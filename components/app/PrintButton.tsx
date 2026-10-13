"use client";
import { Printer } from "lucide-react";

export default function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-line px-4 text-sm transition-colors hover:border-fg/50">
      <Printer size={16} aria-hidden="true" /> Print / save PDF
    </button>
  );
}
