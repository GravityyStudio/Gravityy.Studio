"use client";
import { useUI } from "./Providers";
import Button from "./ui/Button";

/** Opens the contact modal with a prefilled brief (used by server-rendered pages). */
export default function QuoteButton({ prefill, label = "Get a quote", variant = "accent" }: { prefill: string; label?: string; variant?: "accent" | "primary" | "ghost" }) {
  const { openContact } = useUI();
  return (
    <Button variant={variant} onClick={() => openContact(prefill)}>
      {label}
    </Button>
  );
}
